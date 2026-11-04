import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { safeNextPath } from '@/applicant/server'
import { SetPasswordForm } from '@/components/applicant/SetPasswordForm'

export const metadata: Metadata = { title: 'Set your password', robots: { index: false } }

type Args = { searchParams: Promise<{ token?: string; next?: string }> }

// Opened from the link in the sign-up / reset email.
export default async function SetPasswordPage({ searchParams }: Args) {
  const { token, next } = await searchParams
  const safeNext = safeNextPath(next) ?? '/applicant'

  return (
    <section className="section">
      <div className="container">
        <div className="authPage">
          <p className="eyebrow">Coding Exam</p>
          <h1>Almost there</h1>
          {token ? (
            <>
              <p className="lead">Choose a password so you can sign back in to your dashboard.</p>
              <SetPasswordForm next={safeNext} token={token} />
            </>
          ) : (
            <p className="lead">
              This link is incomplete. <Link href="/applicant/login">Request a new one</Link>.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
