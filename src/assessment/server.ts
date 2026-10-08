import type { Payload } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Assessment } from '@/payload-types'

import type { ProctoringEventType } from './events'

// Late requests (slow network, final autosave) are still accepted for this long.
export const GRACE_MS = 60_000

export const getPayloadClient = () => getPayload({ config })

export const findAssessmentByToken = async (payload: Payload, token: string) => {
  if (!/^[\w-]{16,64}$/.test(token)) return null
  const { docs } = await payload.find({
    collection: 'assessments',
    where: { token: { equals: token } },
    limit: 1,
    depth: 0,
  })
  return docs[0] ?? null
}

export const deadlineOf = (assessment: Assessment) =>
  assessment.startedAt
    ? new Date(assessment.startedAt).getTime() + assessment.durationMinutes * 60_000
    : null

export const isInviteExpired = (assessment: Assessment) =>
  assessment.status === 'invited' &&
  !!assessment.expiresAt &&
  Date.now() > new Date(assessment.expiresAt).getTime()

// Scheduled by the hiring workflow: can't be started before availableFrom.
export const isNotYetAvailable = (assessment: Assessment) =>
  assessment.status === 'invited' &&
  !!assessment.availableFrom &&
  Date.now() < new Date(assessment.availableFrom).getTime()

export const logEvent = (
  payload: Payload,
  assessment: Assessment,
  type: ProctoringEventType,
  extra: { at?: string; durationSeconds?: number; characters?: number; detail?: string } = {},
) =>
  payload.create({
    collection: 'proctoring-events',
    data: { assessment: assessment.id, type, at: extra.at ?? new Date().toISOString(), ...extra },
  })

// Closes an attempt whose time ran out without a submit (e.g. the candidate closed the tab).
// The last autosaved code becomes the submission.
export const finalizeIfOverdue = async (payload: Payload, assessment: Assessment) => {
  const deadline = deadlineOf(assessment)
  if (assessment.status !== 'in_progress' || !deadline || Date.now() < deadline + GRACE_MS) {
    return assessment
  }

  await logEvent(payload, assessment, 'time_expired', { at: new Date(deadline).toISOString() })
  return payload.update({
    collection: 'assessments',
    id: assessment.id,
    data: {
      status: 'completed',
      completedAt: new Date(deadline).toISOString(),
      endedBy: 'time_expired',
    },
  })
}

// Loads an assessment for a candidate request, rejecting anything that isn't in progress.
export const loadActiveAssessment = async (token: string) => {
  const payload = await getPayloadClient()
  const found = await findAssessmentByToken(payload, token)
  if (!found) return { payload, error: 'Assessment not found.', status: 404 } as const

  const assessment = await finalizeIfOverdue(payload, found)
  if (assessment.status !== 'in_progress') {
    return { payload, error: 'This assessment is not in progress.', status: 409 } as const
  }
  return { payload, assessment } as const
}
