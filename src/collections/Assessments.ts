import type { CollectionConfig, Field, PayloadRequest } from 'payload'

import { randomBytes } from 'crypto'
import { rm } from 'fs/promises'
import path from 'path'

import type { Assessment } from '@/payload-types'

import { runCode } from '@/playground/judge0'
import { findLanguage } from '@/playground/languages'

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

// ---------------------------------------------------------------------------------------------
// Multi-task support
//
// The admin can add several tasks under Setup. Each task has a prompt and one or more accepted
// answers. The candidate only sees task N+1 after answering task N correctly. The expected
// answers never leave the server: the candidate-facing endpoints below return only the prompts
// of the tasks that are unlocked, and the answer check happens here.
// ---------------------------------------------------------------------------------------------

type TaskRow = {
  id?: string | null
  savedQuestion?: unknown
  title?: string | null
  prompt?: unknown
  acceptedAnswers?: { answer?: string | null }[] | null
  caseSensitive?: boolean | null
  testInput?: string | null
}

type TaskAssessment = Assessment & {
  tasks?: TaskRow[] | null
  currentTaskIndex?: number | null
  wrongAnswers?: number | null
  taskResults?:
    | {
        id?: string | null
        taskNumber?: number | null
        taskTitle?: string | null
        languageLabel?: string | null
        code?: string | null
        output?: string | null
        solvedAt?: string | null
      }[]
    | null
}

// Extra time (ms) allowed after the deadline so a last-second answer isn't rejected by latency.
const ANSWER_GRACE_MS = 30_000

const MAX_CODE_LENGTH = 64 * 1024
const MAX_STDIN_LENGTH = 16 * 1024

// Compares program output: line endings and trailing spaces/blank lines are ignored.
const normalizeOutput = (value: string, caseSensitive: boolean) => {
  const cleaned = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
  return caseSensitive ? cleaned : cleaned.toLowerCase()
}

const isCorrectOutput = (task: TaskRow, output: string) => {
  const caseSensitive = Boolean(task.caseSensitive)
  const actual = normalizeOutput(output, caseSensitive)
  if (!actual) return false
  return (task.acceptedAnswers ?? []).some(
    (row) => row.answer && normalizeOutput(row.answer, caseSensitive) === actual,
  )
}

// What the candidate is allowed to see: only the tasks up to (and including) the current one.
const publicTaskState = (assessment: TaskAssessment) => {
  const tasks = assessment.tasks ?? []
  const current = Math.min(Math.max(assessment.currentTaskIndex ?? 0, 0), tasks.length)
  return {
    total: tasks.length,
    current,
    finished: tasks.length > 0 && current >= tasks.length,
    tasks: tasks
      .slice(0, Math.min(current + 1, tasks.length))
      .map((task, index) => ({ title: task.title || `Task ${index + 1}`, prompt: task.prompt })),
  }
}

const findByToken = async (req: PayloadRequest) => {
  const token = req.routeParams?.token
  if (typeof token !== 'string' || !token) return null
  const { docs } = await req.payload.find({
    collection: 'assessments',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
    req,
  })
  return (docs[0] as TaskAssessment | undefined) ?? null
}

// ---- Saved Questions (reusable tasks) --------------------------------------------------------

// An empty rich-text editor still holds one empty paragraph, so look for real content.
const hasRichText = (value: unknown) => {
  const children =
    (value as { root?: { children?: { type?: string; children?: unknown[] }[] } } | null)?.root
      ?.children ?? []
  return children.some((node) => node.type !== 'paragraph' || (node.children?.length ?? 0) > 0)
}

const idOf = (value: unknown) =>
  value && typeof value === 'object' ? (value as { id?: unknown }).id : value

type SavedQuestionDoc = {
  name?: string | null
  prompt?: unknown
  testInput?: string | null
  caseSensitive?: boolean | null
  acceptedAnswers?: { answer?: string | null }[] | null
}

// When a task points at a saved question, copy its content into the task. Runs before
// validation so the task needn't be filled in by hand. Content is copied once — when the
// question is first picked or changed — so later edits to the saved question don't alter an
// assessment unless it is re-picked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const syncSavedQuestions = async ({
  data,
  originalDoc,
  req,
}: {
  data?: any
  originalDoc?: any
  req: PayloadRequest
}) => {
  const rows = data?.tasks
  if (!Array.isArray(rows)) return data

  const before = new Map<unknown, TaskRow>(
    ((originalDoc?.tasks ?? []) as TaskRow[]).map((row) => [row.id, row]),
  )

  for (const row of rows as TaskRow[]) {
    const savedId = idOf(row.savedQuestion)
    if (savedId == null || savedId === '') continue

    const prior = row.id ? before.get(row.id) : undefined
    if (prior && String(idOf(prior.savedQuestion)) === String(savedId) && hasRichText(row.prompt)) {
      continue
    }

    try {
      const question = (await req.payload.findByID({
        collection: 'saved-questions' as never,
        id: savedId as never,
        depth: 0,
        req,
      })) as unknown as SavedQuestionDoc
      row.title = question.name || row.title
      row.prompt = question.prompt
      row.testInput = question.testInput ?? null
      row.caseSensitive = Boolean(question.caseSensitive)
      row.acceptedAnswers = (question.acceptedAnswers ?? []).map((item) => ({
        answer: item.answer,
      }))
    } catch (error) {
      req.payload.logger.warn({ err: error, msg: `Could not load saved question ${savedId}` })
    }
  }
  return data
}

// Typed loosely on purpose: until `payload generate:types` is re-run, payload-types.ts doesn't
// know the new task fields and TypeScript can't match payload.update's overloads. Once the types
// are regenerated this can be replaced with plain req.payload.update calls.
const updateAssessment = async (
  req: PayloadRequest,
  id: number | string,
  data: Record<string, unknown>,
) =>
  (await req.payload.update({
    collection: 'assessments',
    id,
    data: data as never,
    req,
  })) as unknown as TaskAssessment

const isPastDeadline = (assessment: TaskAssessment) => {
  if (!assessment.startedAt) return false
  const deadline =
    new Date(assessment.startedAt).getTime() + (assessment.durationMinutes || 0) * 60_000
  return Date.now() > deadline + ANSWER_GRACE_MS
}

// Called from afterChange when the admin typed a password into "Candidate login password" and
// saved. Creates (or claims a passwordless) applicant account and links it to the assessment, so
// the candidate can sign in with that password and go straight to the exam.
const createApplicantLogin = async (
  req: PayloadRequest,
  assessment: Assessment,
  password: string,
) => {
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
// they interact through the token-checked routes under /assessment/[token] and the
// token-checked task endpoints defined below.
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
    beforeValidate: [syncSavedQuestions],
    // The password typed into "Candidate login password" is only ever used to create the
    // login below; it's never written to the assessments table.
    beforeChange: [
      ({ data, req, originalDoc }) => {
        if (data?.applicantPassword) req.context.applicantPassword = data.applicantPassword
        if (data) delete data.applicantPassword

        // "Reset assessment" puts the status back to "invited" — also restart the task
        // progression so the candidate begins again at task 1.
        if (data && originalDoc && data.status === 'invited' && originalDoc.status !== 'invited') {
          data.currentTaskIndex = 0
          data.wrongAnswers = 0
          data.taskResults = []
        }
        return data
      },
    ],
    // Hiring workflow: keeps the linked application in step, and sends the Head of Plus the
    // monitoring report when the candidate finishes.
    afterChange: [
      // Created directly here (not by the hiring pipeline, which sets this context flag
      // because it sends its own "technical assessment scheduled" email instead). Skipped when
      // a password was typed into "Candidate login password" too — that case gets only the
      // "your login was created" email below (which includes the same link).
      async ({ doc, operation, req, context }) => {
        if (operation === 'create' && !context?.skipInviteEmail && !context?.applicantPassword) {
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
    {
      // GET /api/assessments/by-token/:token/tasks
      // Candidate-facing (the secret token is the credential, like the /assessment/[token]
      // routes). Returns only the unlocked tasks — never the expected answers.
      path: '/by-token/:token/tasks',
      method: 'get',
      handler: async (req) => {
        const assessment = await findByToken(req)
        if (!assessment) return Response.json({ error: 'Assessment not found.' }, { status: 404 })
        if (assessment.status === 'invited') {
          return Response.json({ error: 'The test has not been started.' }, { status: 409 })
        }
        return Response.json(publicTaskState(assessment))
      },
    },
    {
      // POST /api/assessments/by-token/:token/answer
      //   body: { taskIndex, code, languageId, stdin }
      // The candidate's code is re-run on Judge0 here and its output is compared with the task's
      // expected output. Only a match for the CURRENT task unlocks the next one; the time limit
      // keeps running exactly as before.
      path: '/by-token/:token/answer',
      method: 'post',
      handler: async (req) => {
        const assessment = await findByToken(req)
        if (!assessment) return Response.json({ error: 'Assessment not found.' }, { status: 404 })

        if (assessment.status !== 'in_progress') {
          return Response.json({ error: 'This test is not in progress.' }, { status: 409 })
        }
        if (isPastDeadline(assessment)) {
          return Response.json({ error: 'The time limit has been reached.' }, { status: 409 })
        }

        let body: { taskIndex?: unknown; code?: unknown; languageId?: unknown; stdin?: unknown } =
          {}
        try {
          body = typeof req.json === 'function' ? await req.json() : {}
        } catch {
          return Response.json({ error: 'Invalid request.' }, { status: 400 })
        }
        if (typeof body.taskIndex !== 'number' || typeof body.code !== 'string') {
          return Response.json({ error: 'Invalid request.' }, { status: 400 })
        }
        const language =
          typeof body.languageId === 'number' ? findLanguage(body.languageId) : undefined
        const code = body.code.slice(0, MAX_CODE_LENGTH)
        if (!language || !code.trim()) {
          return Response.json({ error: 'Write some code first.' }, { status: 400 })
        }

        const tasks = assessment.tasks ?? []
        const current = assessment.currentTaskIndex ?? 0
        if (current >= tasks.length) {
          return Response.json({ error: 'All tasks are already complete.' }, { status: 409 })
        }
        // Out of sync (e.g. answered in another tab): hand back the real state.
        if (body.taskIndex !== current) {
          return Response.json(
            {
              error: 'That task is no longer the current one.',
              state: publicTaskState(assessment),
            },
            { status: 409 },
          )
        }

        // A fixed test input set by the admin wins over whatever the candidate typed.
        const task = tasks[current]
        const stdin = task.testInput
          ? task.testInput.slice(0, MAX_STDIN_LENGTH)
          : typeof body.stdin === 'string'
            ? body.stdin.slice(0, MAX_STDIN_LENGTH)
            : ''

        let output = ''
        try {
          const result = await runCode({ languageId: language.id, sourceCode: code, stdin })
          output = result.stdout ?? ''
        } catch {
          return Response.json(
            { error: 'The code runner is unavailable right now. Please try again.' },
            { status: 502 },
          )
        }

        if (!isCorrectOutput(task, output)) {
          await updateAssessment(req, assessment.id, {
            wrongAnswers: (assessment.wrongAnswers ?? 0) + 1,
          })
          return Response.json({ correct: false })
        }

        // Keep this task's code and output so the admin can review every task, not just the
        // code that happens to be in the editor at the end.
        const updated = await updateAssessment(req, assessment.id, {
          currentTaskIndex: current + 1,
          taskResults: [
            ...(assessment.taskResults ?? []),
            {
              taskNumber: current + 1,
              taskTitle: task.title || `Task ${current + 1}`,
              languageLabel: language.label,
              code,
              output: output.slice(0, MAX_STDIN_LENGTH),
              solvedAt: new Date().toISOString(),
            },
          ],
        })

        return Response.json({ correct: true, state: publicTaskState(updated) })
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
              label: 'Single task (legacy)',
              type: 'richText',
              admin: {
                description:
                  'Used only when no tasks are added below. Shown beside the editor. Leave empty to use the instructions from Settings → Code Playground.',
              },
            },
            {
              // Each task has its own answer. The candidate must answer task N correctly
              // before task N+1 is shown. All tasks share the single time limit below.
              name: 'tasks',
              label: 'Tasks (correct output required to move on)',
              type: 'array',
              labels: { singular: 'Task', plural: 'Tasks' },
              admin: {
                initCollapsed: true,
                components: { RowLabel: '/components/admin/TaskRowLabel#TaskRowLabel' },
                description:
                  'Optional. Add 2 or more tasks. The candidates code must print the expected output for a task before the next one appears. The time limit is shared across all tasks. If you add tasks here, the single task above is ignored.',
              },
              fields: [
                {
                  name: 'savedQuestion',
                  label: 'Use a saved question',
                  type: 'relationship',
                  // Cast until payload-types.ts is regenerated and knows this collection.
                  relationTo: 'saved-questions' as never,
                  admin: {
                    description:
                      'Optional. Pick a question from Saved Questions — its title, question, expected output and test input are copied in when you save. Leave the fields below empty.',
                  },
                },
                {
                  name: 'title',
                  type: 'text',
                  admin: { description: 'Optional heading, e.g. "Task 1 — FizzBuzz".' },
                },
                {
                  name: 'prompt',
                  label: 'Question / instructions',
                  type: 'richText',
                  // Required, unless a saved question will supply it.
                  validate: ((value: unknown, { siblingData }: { siblingData?: TaskRow }) =>
                    hasRichText(value) || siblingData?.savedQuestion
                      ? true
                      : 'Write the question, or pick a saved question.') as never,
                },
                {
                  name: 'testInput',
                  label: 'Test input (optional)',
                  type: 'textarea',
                  admin: {
                    description:
                      "Optional. If the program reads input, put it here — it's used when checking the output. Leave empty to use whatever the candidate has in the Input box.",
                  },
                },
                {
                  name: 'acceptedAnswers',
                  label: 'Expected output',
                  type: 'array',
                  // At least one, unless a saved question will supply it.
                  validate: ((value: unknown, { siblingData }: { siblingData?: TaskRow }) =>
                    (Array.isArray(value) && value.length > 0) || siblingData?.savedQuestion
                      ? true
                      : 'Add at least one expected output, or pick a saved question.') as never,
                  labels: { singular: 'Accepted output', plural: 'Accepted outputs' },
                  admin: {
                    description:
                      "The candidate passes this task when their program's output matches ANY of these (the server re-runs their code to check). Line endings and trailing spaces are ignored. Never shown to the candidate.",
                  },
                  fields: [{ name: 'answer', label: 'Output', type: 'textarea', required: true }],
                },
                {
                  name: 'caseSensitive',
                  label: 'Case sensitive',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: { description: 'Off = "Hello" and "hello" count as the same output.' },
                },
                {
                  // Bookmark: saves this task into Saved Questions for reuse.
                  name: 'saveQuestion',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '/components/admin/SaveQuestionButton#SaveQuestionButton',
                    },
                  },
                },
              ],
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
                  admin: { description: 'Total time for all tasks together.' },
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
              // One entry per task, saved when the candidate's output matched.
              name: 'taskResults',
              label: 'Solved tasks',
              type: 'array',
              labels: { singular: 'Task', plural: 'Tasks' },
              admin: {
                readOnly: true,
                description:
                  'The code and output the candidate had when each task was solved, in order.',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'taskNumber',
                      label: 'Task #',
                      type: 'number',
                      admin: { readOnly: true },
                    },
                    { name: 'taskTitle', label: 'Task', type: 'text', admin: { readOnly: true } },
                    {
                      name: 'languageLabel',
                      label: 'Language',
                      type: 'text',
                      admin: { readOnly: true },
                    },
                    {
                      name: 'solvedAt',
                      label: 'Solved at',
                      type: 'date',
                      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
                    },
                  ],
                },
                { name: 'code', type: 'code', admin: { readOnly: true } },
                { name: 'output', label: 'Output', type: 'textarea', admin: { readOnly: true } },
              ],
            },
            {
              name: 'code',
              label: 'Latest code in the editor',
              type: 'code',
              admin: {
                readOnly: true,
                description:
                  'Autosaved while the candidate works; final once submitted. With several tasks this is the code from the last task they worked on — see "Solved tasks" above for each task.',
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
    counter('currentTaskIndex', 'Current task (0 = first)'),
    counter('wrongAnswers', 'Wrong task answers'),
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
