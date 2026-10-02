'use client'

import { Button, FieldLabel, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

// Shows the candidate's invite link (built from the generated token) with a copy button.
export const InviteLinkField = () => {
  const token = useFormFields(([fields]) => fields.token?.value as string | undefined)
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => setOrigin(window.location.origin), [])

  const link = token ? `${origin}/assessment/${token}` : ''

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel label="Invite link" />
      {token ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code
            style={{
              flex: '1 1 320px',
              padding: '10px 12px',
              background: 'var(--theme-elevation-50)',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 4,
              wordBreak: 'break-all',
            }}
          >
            {link}
          </code>
          <Button buttonStyle="secondary" margin={false} onClick={copy} size="medium">
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      ) : (
        <p style={{ color: 'var(--theme-elevation-500)', margin: 0 }}>
          Save the assessment to generate the invite link.
        </p>
      )}
    </div>
  )
}
