'use client'

import { Button, FieldLabel, useField } from '@payloadcms/ui'
import React, { useState } from 'react'

const randomPassword = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 14)

// Masked input for `applicantPassword`. Payload doesn't have a generic password field type
// outside auth collections, so this wraps a plain text field with a show/hide toggle. Typing a
// password here and saving creates the candidate's login (see Assessments.ts hooks) without
// storing the plaintext value on the assessment itself.
export const ApplicantPasswordField = () => {
  const { value, setValue } = useField<string>({ path: 'applicantPassword' })
  const [visible, setVisible] = useState(false)

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label="Candidate login password" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          autoComplete="new-password"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Leave blank to skip"
          style={{
            flex: '1 1 auto',
            padding: '10px 12px',
            background: 'var(--theme-input-bg)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
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
        exam, skipping the usual sign-up email.
      </p>
    </div>
  )
}
