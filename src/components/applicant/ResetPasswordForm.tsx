'use client'

import React, { useState } from 'react'

import { PasswordInput } from './PasswordInput'

const MIN_PASSWORD_LENGTH = 8

// Opened from a "forgot password" email. Unlike SetPasswordForm (first-time sign-up), the
// applicant already has a name on file, so this only asks for the new password.
export const ResetPasswordForm = ({ next = '/applicant', token }: { next?: string; token: string }) => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
    }
    if (password !== confirm) return setError('The passwords don’t match.')

    setBusy(true)
    try {
      const res = await fetch('/applicant/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      window.location.assign(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <form className="authCard" onSubmit={submit}>
      <h2>Reset your password</h2>
      <label className="formField">
        <span>New password</span>
        <PasswordInput
          autoComplete="new-password"
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          onChange={(e) => setPassword(e.target.value)}
          required
          value={password}
        />
      </label>
      <label className="formField">
        <span>Confirm new password</span>
        <PasswordInput
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
          required
          value={confirm}
        />
      </label>
      {error && <p className="assessmentError">{error}</p>}
      <button className="button button--primary" disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save password'}
      </button>
    </form>
  )
}
