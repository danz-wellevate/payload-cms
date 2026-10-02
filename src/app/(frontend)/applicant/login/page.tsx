import type { Metadata } from 'next'

import { redirect } from 'next/navigation'
import React from 'react'

import { getCurrentApplicant, safeNextPath } from '@/applicant/server'
import { LoginForm } from '@/components/applicant/LoginForm'

export const metadata: Metadata = { title: 'Applicant sign in', robots: { index: false } }

type Args = { searchParams: Promise<{ next?: string }> }

// Email first: new applicants are signed up automatically, registered ones enter their password.
export default async function ApplicantLoginPage({ searchParams }: Args) {
  // Registered applicants go straight to their exam unless they came from a specific link.
  const next = safeNextPath((await searchParams).next) ?? '/applicant/exam'
  if (await getCurrentApplicant()) redirect(next)

  return (
    <section className="section">
      <div className="container authPage">
        <p className="eyebrow">Coding Exam</p>
        <h1>Applicant portal</h1>
        <p className="lead">Sign in to take your coding exam and see your results.</p>
        <LoginForm next={next} />
      </div>
    </section>
  )
}
