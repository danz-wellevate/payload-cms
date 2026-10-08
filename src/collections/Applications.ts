import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload'

import { randomBytes } from 'crypto'
import { ValidationError } from 'payload'

import type { Applicant, Application, InterviewSlot, Job } from '@/payload-types'

import { isAdmin } from '../access/isAdmin'
import { runAIReview } from '../recruitment/aiReview'
import {
  notifyHeadOfPlusInterview,
  sendAssessmentScheduled,
  sendFinalInterview,
  sendInterviewBooked,
  sendSchedulingInvite,
} from '../recruitment/emails'
import { applicationStages, deriveStage } from '../recruitment/stages'

const resultOptions = [
  { label: 'Awaiting decision', value: 'pending' },
  { label: 'Passed', value: 'passed' },
  { label: 'Failed', value: 'failed' },
]

const dayAndTime = { date: { pickerAppearance: 'dayAndTime' as const } }

const changed = (a: unknown, b: unknown) => (a ?? null) !== (b ?? null)

// Keeps the stage in sync and stops steps being skipped (e.g. scheduling the technical
// assessment before the initial interview was passed).
const beforeChange: CollectionBeforeChangeHook<Application> = ({ data, originalDoc, req }) => {
  const merged = { ...originalDoc, ...data }

  const fail = (message: string, path: string) => {
    throw new ValidationError({ collection: 'applications', errors: [{ message, path }], req })
  }
  if (changed(data.technicalAssessmentAt, originalDoc?.technicalAssessmentAt)) {
    if (merged.technicalAssessmentAt && merged.initialResult !== 'passed') {
      fail('Mark the initial interview as Passed first.', 'technicalAssessmentAt')
    }
  }
  if (changed(data.finalInterviewAt, originalDoc?.finalInterviewAt)) {
    if (merged.finalInterviewAt && merged.technicalResult !== 'passed') {
      fail('Mark the technical assessment as Passed first.', 'finalInterviewAt')
    }
  }

  data.schedulingToken = merged.schedulingToken || randomBytes(18).toString('base64url')
  data.stage = deriveStage(merged)
  return data
}

// Sends the emails for each step and keeps the linked assessment in sync. Every action is
// keyed on a field changing, so re-saving an application never sends an email twice.
const afterChange: CollectionAfterChangeHook<Application> = async ({ doc, previousDoc, req }) => {
  const { payload } = req
  const prev: Partial<Application> = previousDoc ?? {}
  const job = (
    typeof doc.job === 'object'
      ? doc.job
      : await payload.findByID({ collection: 'jobs', id: doc.job, depth: 0, req })
  ) as Job

  // Step 3: AI score reached the minimum (or an admin ticked "Shortlisted").
  if (doc.stage === 'invited_to_schedule' && prev.stage !== 'invited_to_schedule') {
    await sendSchedulingInvite(payload, doc, job)
  }

  // Steps 4-5: interview booked (by the candidate, or set by an admin).
  if (doc.initialInterviewAt && changed(doc.initialInterviewAt, prev.initialInterviewAt)) {
    const slotId =
      typeof doc.initialInterviewSlot === 'object'
        ? doc.initialInterviewSlot?.id
        : doc.initialInterviewSlot
    const slot = slotId
      ? ((await payload.findByID({
          collection: 'interview-slots',
          id: slotId,
          depth: 0,
          req,
        })) as InterviewSlot)
      : null
    await sendInterviewBooked(payload, doc, job, slot)
    await notifyHeadOfPlusInterview(payload, doc, job)
  }

  // Steps 8-9: technical assessment scheduled. Creates the exam (or moves it if not started).
  if (doc.technicalAssessmentAt && changed(doc.technicalAssessmentAt, prev.technicalAssessmentAt)) {
    const assessmentId = typeof doc.assessment === 'object' ? doc.assessment?.id : doc.assessment
    const existing = assessmentId
      ? await payload
          .findByID({ collection: 'assessments', id: assessmentId, depth: 0, req })
          .catch(() => null)
      : null

    if (existing) {
      if (existing.status === 'invited') {
        await payload.update({
          collection: 'assessments',
          id: existing.id,
          data: { availableFrom: doc.technicalAssessmentAt },
          req,
        })
      }
    } else {
      const applicantId = typeof doc.applicant === 'object' ? doc.applicant?.id : doc.applicant
      const applicant = applicantId
        ? ((await payload.findByID({
            collection: 'applicants',
            id: applicantId,
            depth: 0,
            req,
          })) as Applicant)
        : null
      const assessment = await payload.create({
        collection: 'assessments',
        data: {
          applicant: applicantId ?? undefined,
          candidateName: doc.name || doc.email,
          candidateEmail: doc.email,
          durationMinutes: applicant?.timeLimitMinutes ?? 30,
          availableFrom: doc.technicalAssessmentAt,
          status: 'invited',
          result: 'pending',
        },
        req,
      })
      await payload.update({
        collection: 'applications',
        id: doc.id,
        data: { assessment: assessment.id, assessmentStatus: 'invited' },
        req,
      })
    }
    await sendAssessmentScheduled(payload, doc, job)
  }

  // Step 13: the result can be set here or on the assessment; keep both the same.
  if (changed(doc.technicalResult, prev.technicalResult) && doc.assessment) {
    const assessmentId = typeof doc.assessment === 'object' ? doc.assessment.id : doc.assessment
    const assessment = await payload
      .findByID({ collection: 'assessments', id: assessmentId, depth: 0, req })
      .catch(() => null)
    if (assessment && assessment.result !== doc.technicalResult) {
      await payload.update({
        collection: 'assessments',
        id: assessmentId,
        data: { result: doc.technicalResult ?? 'pending' },
        req,
      })
    }
  }

  // Steps 14-15: final interview scheduled.
  if (doc.finalInterviewAt && changed(doc.finalInterviewAt, prev.finalInterviewAt)) {
    await sendFinalInterview(payload, doc, job)
  }
}

// One per candidate per job posting, created when they apply at /careers/[slug].
export const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Application', plural: 'Applications' },
  admin: {
    group: 'Hiring',
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'job', 'aiScore', 'stage', 'createdAt'],
    listSearchableFields: ['email', 'name'],
    description:
      'Candidates who applied at /careers. Work through each step in the tabs: AI review, initial interview, technical assessment, final interview.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [beforeChange],
    afterChange: [afterChange],
  },
  endpoints: [
    {
      // POST /api/applications/:id/ai-review (the "Run AI review again" button)
      path: '/:id/ai-review',
      method: 'post',
      handler: async (req) => {
        if (!isAdmin({ req })) return Response.json({ error: 'Forbidden' }, { status: 403 })
        const id = req.routeParams?.id as string
        try {
          await req.payload.findByID({ collection: 'applications', id, depth: 0, req })
        } catch {
          return Response.json({ error: 'Application not found.' }, { status: 404 })
        }
        // Updates the existing result in place; only a new invite-level score sends an email.
        const doc = await runAIReview(req.payload, id)
        return Response.json({ aiStatus: doc.aiStatus, aiScore: doc.aiScore, aiError: doc.aiError })
      },
    },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'email', type: 'email', required: true, index: true },
        { name: 'name', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'job', type: 'relationship', relationTo: 'jobs', required: true, index: true },
        { name: 'resume', type: 'upload', relationTo: 'resumes', required: true },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'AI review',
          description:
            "Claude compares the resume with the job's qualifications and required skills. Each one counts as a full match, half (partial) or none; qualifications and skills weigh the same.",
          fields: [
            {
              name: 'aiReviewButton',
              type: 'ui',
              admin: {
                components: { Field: '/components/admin/RunAIReviewButton#RunAIReviewButton' },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'aiScore',
                  label: 'AI match score (%)',
                  type: 'number',
                  admin: { readOnly: true },
                },
                {
                  name: 'shortlisted',
                  type: 'checkbox',
                  admin: {
                    description:
                      "Set automatically from the job's minimum score. Tick it to invite a candidate anyway; this emails them the booking link.",
                  },
                },
              ],
            },
            { name: 'aiSummary', label: 'Summary', type: 'textarea', admin: { readOnly: true } },
            {
              name: 'aiStrengths',
              label: 'Matched (✓ yes, ~ partial)',
              type: 'textarea',
              admin: { readOnly: true, rows: 8 },
            },
            {
              name: 'aiGaps',
              label: 'Missing',
              type: 'textarea',
              admin: { readOnly: true, rows: 6 },
            },
            {
              name: 'aiError',
              label: 'Error',
              type: 'text',
              admin: { readOnly: true, condition: (data) => data?.aiStatus === 'error' },
            },
          ],
        },
        {
          label: 'Initial interview',
          description:
            'The candidate books one of the open Interview slots from the emailed link. You can also set the time here yourself.',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'initialInterviewSlot',
                  label: 'Booked slot',
                  type: 'relationship',
                  relationTo: 'interview-slots',
                  admin: { readOnly: true },
                },
                {
                  name: 'initialInterviewAt',
                  label: 'Interview time',
                  type: 'date',
                  admin: dayAndTime,
                },
              ],
            },
            {
              name: 'initialResult',
              label: 'Initial interview result',
              type: 'select',
              defaultValue: 'pending',
              options: resultOptions,
              admin: { condition: (data) => Boolean(data?.initialInterviewAt) },
            },
            {
              name: 'initialNotes',
              label: 'Interview notes',
              type: 'textarea',
              admin: { condition: (data) => Boolean(data?.initialInterviewAt) },
            },
          ],
        },
        {
          label: 'Technical assessment',
          description:
            'Pick the date and time once the candidate passed the initial interview. Saving emails them the schedule, and the Start button appears in their My Profile at that time.',
          fields: [
            {
              name: 'technicalAssessmentAt',
              label: 'Assessment date and time',
              type: 'date',
              admin: {
                ...dayAndTime,
                condition: (data) => data?.initialResult === 'passed',
              },
            },
            {
              name: 'assessment',
              type: 'relationship',
              relationTo: 'assessments',
              admin: {
                readOnly: true,
                description:
                  'Created automatically. Open it to review the code, recordings and activity.',
                condition: (data) => Boolean(data?.assessment),
              },
            },
            {
              name: 'technicalResult',
              label: 'Technical assessment result',
              type: 'select',
              defaultValue: 'pending',
              options: resultOptions,
              admin: {
                description: 'Same as the Result on the assessment; changing either updates both.',
                condition: (data) => Boolean(data?.assessment),
              },
            },
          ],
        },
        {
          label: 'Final interview',
          fields: [
            {
              name: 'finalInterviewAt',
              label: 'Final interview date and time',
              type: 'date',
              admin: {
                ...dayAndTime,
                description: 'Saving emails the candidate this schedule.',
                condition: (data) => data?.technicalResult === 'passed',
              },
            },
            {
              name: 'finalInterviewDetails',
              label: 'Details for the candidate',
              type: 'textarea',
              admin: {
                description: 'Optional, e.g. the meeting link or address. Included in the email.',
                condition: (data) => data?.technicalResult === 'passed',
              },
            },
          ],
        },
      ],
    },

    // Sidebar
    {
      name: 'stage',
      type: 'select',
      options: applicationStages.map((s) => ({ label: s.label, value: s.value })),
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Updated automatically from the steps below.',
      },
    },
    {
      name: 'applicant',
      label: 'Applicant account',
      type: 'relationship',
      relationTo: 'applicants',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'aiStatus',
      label: 'AI review',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Running', value: 'pending' },
        { label: 'Done', value: 'done' },
        { label: 'Failed', value: 'error' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'aiReviewedAt',
      label: 'Reviewed',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      // Mirrors the linked assessment's status (set by the Assessments hook).
      name: 'assessmentStatus',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'schedulingToken',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true },
    },
  ],
}
