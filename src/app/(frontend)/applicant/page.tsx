import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import React from 'react'

import type { ExamState } from '@/components/applicant/dashboard/ApplicantDashboard'
import type { Assessment, Job } from '@/payload-types'

import { findApplicantExam, getCurrentApplicant } from '@/applicant/server'
import { formatMinutes } from '@/assessment/events'
import {
  deadlineOf,
  finalizeIfOverdue,
  getPayloadClient,
  isNotYetAvailable,
} from '@/assessment/server'
import { ApplicantDashboard } from '@/components/applicant/dashboard/ApplicantDashboard'
import { schedulingLink } from '@/recruitment/emails'
import { formatDateTime } from '@/recruitment/format'
import '@/styles/shadcn.css'

export const metadata: Metadata = { title: 'My profile', robots: { index: false } }

const stateOf = (exam: Assessment | undefined, applied: boolean): ExamState => {
  if (!exam) return applied ? 'not_scheduled' : 'not_started'
  if (isNotYetAvailable(exam)) return 'scheduled'
  if (exam.status === 'invited') return 'not_started'
  if (exam.status === 'in_progress') return 'in_progress'
  if (exam.result === 'passed') return 'passed'
  if (exam.result === 'failed') return 'failed'
  return 'awaiting_review'
}

export default async function ApplicantDashboardPage() {
  const applicant = await getCurrentApplicant()
  if (!applicant) redirect('/applicant/login')

  const payload = await getPayloadClient()
  const found = await findApplicantExam(payload, applicant)
  const exam = found ? await finalizeIfOverdue(payload, found) : undefined

  const deadline = exam ? deadlineOf(exam) : null

  // The most recent job application, if they applied through /careers.
  const { docs: applications } = await payload.find({
    collection: 'applications',
    where: { applicant: { equals: applicant.id } },
    sort: '-createdAt',
    limit: 1,
    depth: 1,
  })
  const app = applications[0]
  const when = (value?: string | null) => (value ? formatDateTime(value) : null)

  return (
    <ApplicantDashboard
      completedAt={exam?.completedAt}
      email={applicant.email}
      feedback={exam?.feedback}
      language={exam?.languageLabel}
      minutesLeft={deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 60_000)) : null}
      name={applicant.name || applicant.email}
      startedAt={exam?.startedAt}
      state={stateOf(exam, Boolean(app))}
      availableFrom={exam?.availableFrom}
      application={
        app
          ? {
              jobTitle: (app.job as Job).title,
              stage: app.stage ?? 'screening',
              schedulingHref: app.schedulingToken ? schedulingLink(app.schedulingToken) : null,
              initialInterviewAt: when(app.initialInterviewAt),
              technicalAssessmentAt: when(app.technicalAssessmentAt),
              finalInterviewAt: when(app.finalInterviewAt),
              finalInterviewDetails: app.finalInterviewDetails,
            }
          : null
      }
      timedOut={exam?.endedBy === 'time_expired'}
      timeLimit={formatMinutes(exam ? exam.durationMinutes : applicant.timeLimitMinutes)}
    />
  )
}
