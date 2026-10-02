import { NextResponse } from 'next/server'

import { findApplicantExam, getCurrentApplicant, loginUrl } from '@/applicant/server'
import { getPayloadClient } from '@/assessment/server'

// Opens the applicant's exam in the IDE: linked from sign-in (GET) and the dashboard's
// Start/Resume button (POST). Each applicant gets one exam attempt; admins can allow a retake
// by setting the assessment back to "Invited". The timer only starts on the exam's Start button.
const openExam = async (request: Request) => {
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url), 303)

  const applicant = await getCurrentApplicant()
  if (!applicant) return redirect(loginUrl('/applicant/exam'))

  const payload = await getPayloadClient()
  let assessment = await findApplicantExam(payload, applicant)
  if (assessment?.status === 'completed') return redirect('/applicant')

  if (!assessment) {
    assessment = await payload.create({
      collection: 'assessments',
      data: {
        applicant: applicant.id,
        candidateName: applicant.name || applicant.email,
        candidateEmail: applicant.email,
        durationMinutes: applicant.timeLimitMinutes,
        status: 'invited',
        result: 'pending',
      },
    })
  }

  return redirect(`/assessment/${assessment.token}`)
}

export const GET = openExam
export const POST = openExam
