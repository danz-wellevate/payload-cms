import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { randomBytes } from 'crypto'
import { rm } from 'fs/promises'
import path from 'path'

import type { Assessment } from '@/payload-types'

import { isAdmin } from '../access/isAdmin'
import { flaggedEventTypes } from '../assessment/events'
import { resetAssessment } from '../assessment/reset'
import { DEFAULT_TIME_LIMIT_MINUTES } from './Applicants'
import {
  notifyHeadOfPlusAssessmentDone,
  sendApplicantLoginCreated,
  sendAssessmentInvite,
} from '../recruitment/emails'

const MIN_PASSWORD_LENGTH = 8
const normalizeEmail = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : ''

// Proctoring collections that store a file alongside the row (see beforeDelete below).
const captureCollections = ['proctoring-recordings', 'proctoring-snapshots'] as const

// Called from afterChange when the admin typed a password into "Candidate login password" and
// saved. Creates (or claims a passwordless) applicant account and links it to the assessment, so
// the candidate can sign in with that password and go straight to the exam.
const createApplicantLogin = async (req: PayloadRequest, assessment: Assessment, password: string) => {
  const email = normalizeEmail(assessment.candidateEmail)
  if (!email) return

  try {
    const { docs } = await req.payload.find({
      collection: 'applicants',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      req,
    })

    let applicant = docs[0]
    if (applicant) {
      if (applicant.passwordSet) {
        req.payload.logger.warn(
          `Skipped creating a login for ${email}: an applicant account already exists.`,
        )
        return
      }
      applicant = await req.payload.update({
        collection: 'applicants',
        id: applicant.id,
        data: { password, passwordSet: true, name: assessment.candidateName || applicant.name },
        req,
      })
    } else {
      applicant = await req.payload.create({
        collection: 'applicants',
        data: {
          email,
          name: assessment.candidateName || undefined,
          password,
          passwordSet: true,
          timeLimitMinutes: assessment.durationMinutes || DEFAULT_TIME_LIMIT_MINUTES,
        },
        req,
      })
    }

    await req.payload.update({
      collection: 'assessments',
      id: assessment.id,
      data: { applicant: applicant.id },
      req,
    })

    await sendApplicantLoginCreated(req.payload, assessment, password)
  } catch (error) {
    req.payload.logger.warn({ err: error, msg: `Could not create applicant login for ${email}` })
  }
}

const dateTime = (name: string, label: string): Field => ({
  name,
  label,
  type: 'date',
  admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
})

const counter = (name: string, label: string): Field => ({
  name,
  label,
  type: 'number',
  defaultValue: 0,
  admin: { position: 'sidebar', readOnly: true },
})

// One document per candidate. Candidates never get API access to this collection;
// they interact through the token-checked routes under /assessment/[token].
export const Assessments: CollectionConfig = {
  slug: 'assessments',
  labels: { singular: 'Assessment', plural: 'Assessments' },
  admin: {
    group: 'Assessments',
    useAsTitle: 'candidateName',
    defaultColumns: [
      'candidateName',
      'candidateEmail',
      'status',
      'result',
      'tabSwitches',
      'completedAt',
    ],
    description:
      'Exam attempts. Applicants get one automatically when they start the exam from their dashboard; you can also create one and send the invite link. Review the submission and set the result.',
    components: {
      views: {
        edit: {
          // Full-page applicant analysis: synced screen + webcam + activity, and the submission.
          review: {
            Component: '/components/admin/review/ReviewView#ReviewView',
            path: '/review',
            tab: { href: '/review', label: 'Review', order: 150 },
          },
        },
      },
    },
  },
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    // The password typed into "Candidate login password" is only ever used to create the
    // login below; it's never written to the assessments table.
    beforeChange: [
      ({ data, req }) => {
        if (data?.applicantPassword) req.context.applicantPassword = data.applicantPassword
        if (data) delete data.applicantPassword
        return data
      },
    ],
    // Hiring workflow: keeps the linked application in step, and sends the Head of Plus the
    // monitoring report when the candidate finishes.
    afterChange: [
      // Created directly here (not by the hiring pipeline, which sets this context flag
      // because it sends its own "technical assessment scheduled" email instead).
      async ({ doc, operation, req, context }) => {
        if (operation === 'create' && !context?.skipInviteEmail) {
          await sendAssessmentInvite(req.payload, doc)
        }
      },
      // Set up the candidate's login if a password was submitted and none is linked yet.
      async ({ doc, req, context }) => {
        const password = context?.applicantPassword as string | undefined
        if (!password || doc.applicant) return
        await createApplicantLogin(req, doc, password)
      },
      async ({ doc, previousDoc, req }) => {
        if (doc.status === previousDoc?.status && doc.result === previousDoc?.result) return
        const { docs } = await req.payload.find({
          collection: 'applications',
          where: { assessment: { equals: doc.id } },
          limit: 1,
          depth: 0,
          req,
        })
        const application = docs[0]
        if (!application) return

        if (
          application.assessmentStatus !== doc.status ||
          application.technicalResult !== doc.result
        ) {
          await req.payload.update({
            collection: 'applications',
            id: application.id,
            data: { assessmentStatus: doc.status, technicalResult: doc.result },
            req,
          })
        }

        if (doc.status === 'completed' && previousDoc?.status !== 'completed') {
          const flagged = await req.payload.count({
            collection: 'proctoring-events',
            where: {
              and: [{ assessment: { equals: doc.id } }, { type: { in: flaggedEventTypes } }],
            },
            req,
          })
          await notifyHeadOfPlusAssessmentDone(req.payload, application, doc, flagged.totalDocs)
        }
      },
    ],
    // Proctoring events/recordings/snapshots all require an assessment, so their foreign key
    // can't be nulled out and Postgres refuses to delete a row anything still points at.
    //
    // These go through the database layer rather than payload.delete(): a nested bulk delete
    // swallows its own per-document errors and rolls back the transaction the assessment is
    // being deleted in, which made the whole delete fail with "transaction is aborted". That
    // means the capture files have to be removed separately, in afterDelete.
    beforeDelete: [
      async ({ id, req }) => {
        const pending = (req.context.captureFiles as string[] | undefined) ?? []

        for (const collection of captureCollections) {
          const staticDir = req.payload.collections[collection]?.config.upload?.staticDir
          const { docs } = await req.payload.find({
            collection,
            where: { assessment: { equals: id } },
            depth: 0,
            limit: 0,
            pagination: false,
            req,
          })
          for (const doc of docs) {
            if (staticDir && doc.filename) pending.push(path.resolve(staticDir, doc.filename))
          }
        }
        req.context.captureFiles = pending

        for (const collection of ['proctoring-events', ...captureCollections] as const) {
          await req.payload.db.deleteMany({
            collection,
            where: { assessment: { equals: id } },
            req,
          })
        }
      },
    ],
    afterDelete: [
      async ({ req }) => {
        const files = (req.context.captureFiles as string[] | undefined)?.splice(0) ?? []
        await Promise.all(
          files.map((file) =>
            rm(file, { force: true }).catch((err) =>
              req.payload.logger.warn({ err, msg: `Could not delete capture file ${file}` }),
            ),
          ),
        )
      },
    ],
  },
  endpoints: [
    {
      // POST /api/assessments/:id/reset (used by the "Reset assessment" button)
      path: '/:id/reset',
      method: 'post',
      handler: async (req) => {
        if (!isAdmin({ req })) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const id = req.routeParams?.id as string
        try {
          await req.payload.findByID({ collection: 'assessments', id, depth: 0, req })
        } catch {
          return Response.json({ error: 'Assessment not found.' }, { status: 404 })
        }
        await resetAssessment(req, id)
        return Response.json({ ok: true })
      },
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'candidateName', type: 'text', required: true },
        {
          name: 'candidateEmail',
          type: 'email',
          required: true,
          admin: {
            components: { Field: '/components/admin/CandidateEmailField#CandidateEmailField' },
          },
        },
      ],
    },
    {
      name: 'inviteLink',
      type: 'ui',
      admin: { components: { Field: '/components/admin/InviteLinkField#InviteLinkField' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Setup',
          fields: [
            {
              name: 'task',
              type: 'richText',
              admin: {
                description:
                  'Shown beside the editor. Leave empty to use the instructions from Settings → Code Playground.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'durationMinutes',
                  label: 'Time limit (minutes)',
                  type: 'number',
                  defaultValue: 30,
                  min: 1,
                  max: 480,
                  required: true,
                },
                {
                  name: 'availableFrom',
                  label: 'Available from',
                  type: 'date',
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    description:
                      'Optional. The Start button appears in My Profile at this time. Set by the hiring workflow.',
                  },
                },
                {
                  name: 'expiresAt',
                  label: 'Invite expires',
                  type: 'date',
                  admin: {
                    date: { pickerAppearance: 'dayAndTime' },
                    description: 'Optional. The test can no longer be started after this.',
                  },
                },
              ],
            },
            {
              name: 'requireWebcam',
              type: 'checkbox',
              defaultValue: true,
              label: 'Record webcam video',
              admin: {
                description: "Records the candidate's webcam in 1-minute clips (Proctoring tab).",
              },
            },
            {
              name: 'recordScreen',
              type: 'checkbox',
              defaultValue: true,
              label: 'Record screen',
              admin: {
                description:
                  'The candidate must share their entire screen, which is recorded in 1-minute clips.',
              },
            },
          ],
        },
        {
          label: 'Submission',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'languageLabel',
                  label: 'Language',
                  type: 'text',
                  admin: { readOnly: true },
                },
                { name: 'languageId', type: 'number', admin: { readOnly: true, hidden: true } },
              ],
            },
            {
              name: 'code',
              type: 'code',
              admin: {
                readOnly: true,
                description: 'Autosaved while the candidate works; final once submitted.',
              },
            },
            {
              name: 'finalRun',
              label: 'Result of the submitted code',
              type: 'group',
              admin: {
                description:
                  "The server re-runs the submitted code on Judge0 with the candidate's last input, so this output is verified.",
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'status', type: 'text', admin: { readOnly: true } },
                    { name: 'time', label: 'Time (s)', type: 'text', admin: { readOnly: true } },
                    {
                      name: 'memory',
                      label: 'Memory (KB)',
                      type: 'number',
                      admin: { readOnly: true },
                    },
                  ],
                },
                { name: 'stdin', label: 'Input', type: 'textarea', admin: { readOnly: true } },
                { name: 'stdout', label: 'Output', type: 'textarea', admin: { readOnly: true } },
                {
                  name: 'errors',
                  label: 'Errors / compiler output',
                  type: 'textarea',
                  admin: { readOnly: true },
                },
              ],
            },
            {
              name: 'feedback',
              label: 'Feedback for the applicant',
              type: 'textarea',
              admin: {
                description: "Optional. Shown on the applicant's dashboard once a result is set.",
              },
            },
          ],
        },
        {
          label: 'Proctoring',
          fields: [
            {
              // Screen + webcam players, activity timeline and per-day deletion, all synced.
              name: 'proctoringReview',
              type: 'ui',
              admin: {
                components: { Field: '/components/admin/ProctoringReview#ProctoringReview' },
              },
            },
            {
              // Only shown for older assessments that still have snapshots.
              name: 'snapshotGallery',
              type: 'ui',
              admin: { components: { Field: '/components/admin/SnapshotGallery#SnapshotGallery' } },
            },
          ],
        },
      ],
    },

    // Sidebar: reset, result, status, timing and the integrity summary
    {
      name: 'resetAssessment',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/admin/ResetAssessmentButton#ResetAssessmentButton' },
      },
    },
    {
      name: 'result',
      type: 'select',
      defaultValue: 'pending',
      required: true,
      options: [
        { label: 'Awaiting review', value: 'pending' },
        { label: 'Passed', value: 'passed' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        position: 'sidebar',
        description: "Shown on the applicant's dashboard.",
      },
    },
    {
      name: 'applicant',
      type: 'relationship',
      relationTo: 'applicants',
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (data) => Boolean(data?.applicant),
        description: 'Set by picking an existing applicant in the Candidate email field above.',
      },
    },
    {
      name: 'applicantPassword',
      label: 'Candidate login password',
      type: 'text',
      validate: (value: string | null | undefined) =>
        !value ||
        value.length >= MIN_PASSWORD_LENGTH ||
        `Use at least ${MIN_PASSWORD_LENGTH} characters, or leave this blank.`,
      admin: {
        position: 'sidebar',
        condition: (data) => !data?.applicant,
        components: { Field: '/components/admin/ApplicantPasswordField#ApplicantPasswordField' },
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'invited',
      required: true,
      options: [
        { label: 'Invited', value: 'invited' },
        { label: 'In progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Use "Reset assessment" above to let the candidate retake the test.',
      },
    },
    {
      name: 'token',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', readOnly: true },
      hooks: {
        beforeValidate: [({ value }) => value || randomBytes(18).toString('base64url')],
      },
    },
    {
      type: 'collapsible',
      label: 'Timing',
      admin: { position: 'sidebar' },
      fields: [
        dateTime('startedAt', 'Started'),
        dateTime('completedAt', 'Completed'),
        {
          name: 'endedBy',
          label: 'Ended by',
          type: 'select',
          options: [
            { label: 'Candidate submitted', value: 'submitted' },
            { label: 'Time limit reached', value: 'time_expired' },
          ],
          admin: { readOnly: true },
        },
        {
          name: 'submittedLate',
          type: 'checkbox',
          admin: { readOnly: true, description: 'Submitted after the time limit.' },
        },
      ],
    },
    counter('tabSwitches', 'Left tab / window (times)'),
    counter('timeAwaySeconds', 'Time away (seconds)'),
    counter('fullscreenExits', 'Full-screen exits'),
    counter('pastes', 'Pastes'),
    counter('pastedCharacters', 'Pasted characters'),
    counter('codeRuns', 'Code runs'),
    {
      name: 'multipleMonitors',
      type: 'checkbox',
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
