import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { safeNextPath } from '@/applicant/server'
import { ResetPasswordForm } from '@/components/applicant/ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

type Args = { searchParams: Promise<{ token?: string; next?: string }> }

// Opened from the "forgot your password" email. Separate from /applicant/set-password (first
// sign-up) so returning applicants aren't asked for their name again.
export default async function ResetPasswordPage({ searchParams }: Args) {
  const { token, next } = await searchParams
  const safeNext = safeNextPath(next) ?? '/applicant'

  return (
    <section className="section">
      <div className="container">
        <div className="authPage">
          <p className="eyebrow">Coding Exam</p>
          <h1>Reset your password</h1>
          {token ? (
            <>
              <p className="lead">Choose a new password to sign back in to your dashboard.</p>
              <ResetPasswordForm next={safeNext} token={token} />
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
