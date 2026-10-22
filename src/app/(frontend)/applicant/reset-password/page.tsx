import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { ResetPasswordForm } from '@/components/applicant/ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset your password', robots: { index: false } }

type Args = { searchParams: Promise<{ token?: string }> }

// Opened from the "forgot your password" email. Separate from /applicant/set-password (first
// sign-up) so returning applicants aren't asked for their name again.
export default async function ResetPasswordPage({ searchParams }: Args) {
  const { token } = await searchParams

  return (
    <section className="section">
      <div className="container authPage">
        <p className="eyebrow">Coding Exam</p>
        <h1>Reset your password</h1>
        {token ? (
          <>
            <p className="lead">Choose a new password to sign back in to your dashboard.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <p className="lead">
            This link is incomplete. <Link href="/applicant/login">Request a new one</Link>.
          </p>
        )}
      </div>
    </section>
  )
}
