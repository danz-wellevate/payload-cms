import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import React from 'react'

import type { ExamState } from '@/components/applicant/dashboard/ApplicantDashboard'
import type { Assessment } from '@/payload-types'

import { findApplicantExam, getCurrentApplicant } from '@/applicant/server'
import { formatMinutes } from '@/assessment/events'
import { deadlineOf, finalizeIfOverdue, getPayloadClient } from '@/assessment/server'
import { ApplicantDashboard } from '@/components/applicant/dashboard/ApplicantDashboard'
import '@/styles/shadcn.css'

export const metadata: Metadata = { title: 'Applicant dashboard', robots: { index: false } }

const stateOf = (exam: Assessment | undefined): ExamState => {
  if (!exam || exam.status === 'invited') return 'not_started'
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

  return (
    <ApplicantDashboard
      completedAt={exam?.completedAt}
      email={applicant.email}
      feedback={exam?.feedback}
      language={exam?.languageLabel}
      minutesLeft={deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 60_000)) : null}
      name={applicant.name || applicant.email}
      startedAt={exam?.startedAt}
      state={stateOf(exam)}
      timedOut={exam?.endedBy === 'time_expired'}
      timeLimit={formatMinutes(exam ? exam.durationMinutes : applicant.timeLimitMinutes)}
    />
  )
}
