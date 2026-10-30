'use client'

import { Button, FieldLabel, toast, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

const randomPassword = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 14)

const boxStyle = {
  flex: '1 1 auto',
  padding: '10px 12px',
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 4,
  wordBreak: 'break-all' as const,
}

// Masked input for `applicantPassword`. Payload doesn't have a generic password field type
// outside auth collections, so this wraps a plain text field with a show/hide toggle.
//
// The value is kept on the assessment document (see Assessments.ts) rather than cleared after
// use, so an admin can come back later and read it — SMTP delivery isn't reliable enough yet to
// assume the candidate ever got the automatic "your login" email, so it needs to be sendable
// manually too.
//
// Once a login has been created (the `applicant` relationship is set), typing a new password
// here wouldn't actually change the candidate's real login — createApplicantLogin only runs
// once, when the login is first created — so the field switches to a read-only reveal instead
// of an editable input to avoid showing a password that's no longer the real one.
export const ApplicantPasswordField = () => {
  const { value, setValue } = useField<string>({ path: 'applicantPassword' })
  const applicant = useFormFields(([fields]) => fields.applicant?.value)
  const [visible, setVisible] = useState(false)

  const prevApplicant = React.useRef(applicant)
  useEffect(() => {
    if (!prevApplicant.current && applicant && value) {
      toast.success('Candidate login created. The password stays here if you need to send it manually.')
    }
    prevApplicant.current = applicant
  }, [applicant, value])

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast.success('Password copied')
  }

  if (applicant) {
    if (!value) return null
    return (
      <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
        <FieldLabel label="Candidate login password" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={boxStyle}>{visible ? value : '•'.repeat(value.length)}</code>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => setVisible((v) => !v)}
            size="medium"
            type="button"
          >
            {visible ? 'Hide' : 'Show'}
          </Button>
          <Button
            buttonStyle="secondary"
            margin={false}
            onClick={() => copy(value)}
            size="medium"
            type="button"
          >
            Copy
          </Button>
        </div>
        <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '6px 0 0' }}>
          Login already created. Email delivery can be delayed right now — send this to the
          candidate directly along with the invite link above.
        </p>
      </div>
    )
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label="Candidate login password" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          autoComplete="new-password"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Leave blank to skip"
          style={{
            ...boxStyle,
            background: 'var(--theme-input-bg)',
          }}
          type={visible ? 'text' : 'password'}
          value={value ?? ''}
        />
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={() => setVisible((v) => !v)}
          size="medium"
          type="button"
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
        <Button
          buttonStyle="secondary"
          margin={false}
          onClick={() => {
            setValue(randomPassword())
            setVisible(true)
          }}
          size="medium"
          type="button"
        >
          Generate
        </Button>
      </div>
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '6px 0 0' }}>
        Optional. Set this and save to create the candidate&apos;s login — this password and the
        invite link are emailed to them automatically, so they can sign in and go straight to the
        exam, skipping the usual sign-up email. It stays visible here afterward too, in case you
        need to send it manually.
      </p>
    </div>
  )
}
