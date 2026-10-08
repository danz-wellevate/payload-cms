import type { Application } from '@/payload-types'

// Where an application is in the hiring workflow. Never set by hand: it's worked out from the
// other fields every time the application is saved (see deriveStage).
export const applicationStages = [
  { value: 'screening', label: 'AI review running' },
  { value: 'ai_error', label: 'AI review failed' },
  { value: 'not_shortlisted', label: 'Below AI score' },
  { value: 'invited_to_schedule', label: 'Invited to book interview' },
  { value: 'initial_scheduled', label: 'Initial interview booked' },
  { value: 'initial_failed', label: 'Failed initial interview' },
  { value: 'initial_passed', label: 'Passed initial interview' },
  { value: 'assessment_scheduled', label: 'Assessment scheduled' },
  { value: 'assessment_in_progress', label: 'Taking assessment' },
  { value: 'assessment_submitted', label: 'Assessment to review' },
  { value: 'assessment_failed', label: 'Failed assessment' },
  { value: 'assessment_passed', label: 'Passed assessment' },
  { value: 'final_scheduled', label: 'Final interview scheduled' },
] as const

export type ApplicationStage = (typeof applicationStages)[number]['value']

export const stageLabel = (stage: string | null | undefined) =>
  applicationStages.find((s) => s.value === stage)?.label ?? 'Applied'

type StageInput = Pick<
  Application,
  | 'aiStatus'
  | 'shortlisted'
  | 'initialInterviewAt'
  | 'initialResult'
  | 'technicalAssessmentAt'
  | 'assessmentStatus'
  | 'technicalResult'
  | 'finalInterviewAt'
>

// Latest step first: the furthest point the application has reached wins.
export const deriveStage = (d: Partial<StageInput>): ApplicationStage => {
  if (d.technicalResult === 'passed' && d.finalInterviewAt) return 'final_scheduled'
  if (d.technicalResult === 'passed') return 'assessment_passed'
  if (d.technicalResult === 'failed') return 'assessment_failed'
  if (d.assessmentStatus === 'completed') return 'assessment_submitted'
  if (d.assessmentStatus === 'in_progress') return 'assessment_in_progress'
  if (d.initialResult === 'passed' && d.technicalAssessmentAt) return 'assessment_scheduled'
  if (d.initialResult === 'passed') return 'initial_passed'
  if (d.initialResult === 'failed') return 'initial_failed'
  if (d.initialInterviewAt) return 'initial_scheduled'
  if (d.aiStatus === 'done') return d.shortlisted ? 'invited_to_schedule' : 'not_shortlisted'
  if (d.aiStatus === 'error') return 'ai_error'
  return 'screening'
}
