import type { Metadata } from 'next'

import { RichText } from '@payloadcms/richtext-lexical/react'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { getCurrentApplicant, loginUrl, normalizeEmail } from '@/applicant/server'
import {
  finalizeIfOverdue,
  findAssessmentByToken,
  getPayloadClient,
  isInviteExpired,
} from '@/assessment/server'
import { AssessmentRunner } from '@/components/assessment/AssessmentRunner'

type Args = { params: Promise<{ token: string }> }

export const metadata: Metadata = {
  title: 'Coding Assessment',
  robots: { index: false, follow: false },
}

const Message = ({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: React.ReactNode
}) => (
  <section className="section">
    <div className="container assessmentMessage">
      <p className="eyebrow">Coding Assessment</p>
      <h1>{title}</h1>
      <p className="lead">{body}</p>
      {children}
    </div>
  </section>
)

// The proctored exam. Applicants reach it from their dashboard, or through an invite link
// created in Admin → Assessments; either way they must be signed in first.
export default async function AssessmentPage({ params }: Args) {
  const { token } = await params

  const applicant = await getCurrentApplicant()
  if (!applicant) redirect(loginUrl(`/assessment/${token}`))

  const payload = await getPayloadClient()
  const found = await findAssessmentByToken(payload, token)
  if (!found) notFound()

  // An admin-created invite is claimed by the applicant it was sent to.
  let assessment = found
  if (assessment.applicant == null && normalizeEmail(assessment.candidateEmail) === applicant.email) {
    assessment = await payload.update({
      collection: 'assessments',
      id: assessment.id,
      data: { applicant: applicant.id },
    })
  }

  if (assessment.applicant !== applicant.id) {
    return (
      <Message
        body={`This exam link was sent to a different email address. You're signed in as ${applicant.email}.`}
        title="This exam belongs to another account"
      >
        <form action="/applicant/auth/logout" method="post">
          <button className="button button--outline" type="submit">
            Sign in with a different email
          </button>
        </form>
      </Message>
    )
  }

  assessment = await finalizeIfOverdue(payload, assessment)
  if (assessment.status === 'completed') redirect('/applicant')

  if (isInviteExpired(assessment)) {
    return (
      <Message
        body="This invite link has expired. Please contact the person who sent it to you."
        title="Invite expired"
      />
    )
  }

  const settings = await payload.findGlobal({ slug: 'playground' })
  const instructions = assessment.task ?? settings.instructions

  return (
    <AssessmentRunner
      candidateName={assessment.candidateName}
      durationMinutes={assessment.durationMinutes}
      exitHref="/applicant"
      inProgress={assessment.status === 'in_progress'}
      recordScreen={assessment.recordScreen !== false}
      requireWebcam={assessment.requireWebcam !== false}
      token={token}
    >
      <p className="eyebrow">Your task</p>
      <h1>{settings.heading}</h1>
      {instructions ? (
        <RichText className="prose" data={instructions} />
      ) : (
        <p className="muted">No instructions were provided for this test.</p>
      )}
    </AssessmentRunner>
  )
}
