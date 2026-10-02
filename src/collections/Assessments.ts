import type { CollectionConfig, Field } from 'payload'

import { randomBytes } from 'crypto'

import { isAdmin } from '../access/isAdmin'
import { resetAssessment } from '../assessment/reset'

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
        { name: 'candidateEmail', type: 'email', required: true },
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
      admin: { position: 'sidebar' },
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
