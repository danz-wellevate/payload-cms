'use client'

import React, { useState } from 'react'

import { PasswordInput } from './PasswordInput'

type Step = 'email' | 'password' | 'check-email'

const post = async (url: string, body: unknown) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
  return data
}

// Email first: new emails get an account and a set-password link; returning applicants
// enter their password.
export const LoginForm = ({ next = '/applicant/exam' }: { next?: string }) => {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Only sent by the server in local development when SMTP isn't configured.
  const [devLink, setDevLink] = useState<string | null>(null)

  const handle = (action: () => Promise<void>) => async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const submitEmail = handle(async () => {
    const data = await post('/applicant/auth/continue', { email })
    setDevLink(data.devLink ?? null)
    setStep(data.next)
  })

  const submitPassword = handle(async () => {
    await post('/applicant/auth/login', { email, password })
    window.location.assign(next)
  })

  const sendLink = handle(async () => {
    const data = await post('/applicant/auth/continue', { email, resend: true })
    setDevLink(data.devLink ?? null)
    setStep('check-email')
  })

  if (step === 'check-email' && devLink) {
    return (
      <div className="authCard">
        <h2>Set your password</h2>
        <p className="devNotice">
          <strong>Development mode:</strong> email isn&apos;t set up yet (no SMTP in .env), so the
          link that would be emailed to <strong>{email}</strong> is shown here instead.
        </p>
        <a className="button button--primary" href={devLink}>
          Continue to set password
        </a>
        <button className="linkButton" onClick={() => setStep('email')} type="button">
          ← Use a different email
        </button>
      </div>
    )
  }

  if (step === 'check-email') {
    return (
      <div className="authCard">
        <h2>Check your email</h2>
        <p>
          We sent a link to <strong>{email}</strong>. Open it to set your password and go to your
          dashboard. The link expires in 24 hours.
        </p>
        <p className="muted">
          Didn&apos;t get it? Check your spam folder, or{' '}
          <button className="linkButton" disabled={busy} onClick={() => sendLink()} type="button">
            send it again
          </button>
          .
        </p>
        {error && <p className="assessmentError">{error}</p>}
        <button className="linkButton" onClick={() => setStep('email')} type="button">
          ← Use a different email
        </button>
      </div>
    )
  }

  if (step === 'password') {
    return (
      <form className="authCard" onSubmit={submitPassword}>
        <h2>Welcome back</h2>
        <p className="muted">
          Signing in as <strong>{email}</strong>{' '}
          <button className="linkButton" onClick={() => setStep('email')} type="button">
            (change)
          </button>
        </p>
        <label className="formField">
          <span>Password</span>
          <PasswordInput
            autoComplete="current-password"
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            required
            value={password}
          />
        </label>
        {error && <p className="assessmentError">{error}</p>}
        <button className="button button--primary" disabled={busy} type="submit">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <button className="linkButton" disabled={busy} onClick={() => sendLink()} type="button">
          Forgot your password? Email me a link
        </button>
      </form>
    )
  }

  return (
    <form className="authCard" onSubmit={submitEmail}>
      <h2>Sign in or sign up</h2>
      <p className="muted">
        Enter your email. If you&apos;re new, we&apos;ll create your account and email you a link to
        set your password.
      </p>
      <label className="formField">
        <span>Email</span>
        <input
          autoComplete="email"
          autoFocus
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      {error && <p className="assessmentError">{error}</p>}
      <button className="button button--primary" disabled={busy} type="submit">
        {busy ? 'Please wait…' : 'Continue'}
      </button>
    </form>
  )
}
