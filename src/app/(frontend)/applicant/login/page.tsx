import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import React from 'react'

import { getCurrentApplicant, isValidEmail, normalizeEmail, safeNextPath } from '@/applicant/server'
import { LoginForm } from '@/components/applicant/LoginForm'

export const metadata: Metadata = { title: 'Applicant sign in', robots: { index: false } }

type Args = { searchParams: Promise<{ next?: string; email?: string }> }

// Email first: new applicants are signed up automatically, registered ones enter their password.
// An `email` query param (e.g. straight after applying at /careers) skips the email step.
export default async function ApplicantLoginPage({ searchParams }: Args) {
  const params = await searchParams
  // Registered applicants go straight to their exam unless they came from a specific link.
  const next = safeNextPath(params.next) ?? '/applicant/exam'
  if (await getCurrentApplicant()) redirect(next)

  const email = normalizeEmail(params.email)

  return (
    <section className="section">
      <div className="container authPage">
        <p className="eyebrow">Coding Exam</p>
        <h1>Applicant portal</h1>
        <p className="lead">Sign in to take your coding exam and see your results.</p>
        <LoginForm initialEmail={isValidEmail(email) ? email : undefined} next={next} />
      </div>
    </section>
  )
}
