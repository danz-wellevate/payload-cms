'use client'

import { Button, toast, useConfig, useDocumentInfo, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'

// Re-scores the resume, e.g. after editing the job's qualifications or when the review failed.
export const RunAIReviewButton = () => {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const aiStatus = useFormFields(([fields]) => fields.aiStatus?.value as string | undefined)
  const [busy, setBusy] = useState(false)

  if (!id) return null

  const run = async () => {
    setBusy(true)
    try {
      const res = await fetch(`${api}/applications/${id}/ai-review`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not run the AI review.')
      if (data.aiStatus === 'error') throw new Error(data.aiError ?? 'The AI review failed.')
      toast.success(`AI review done: ${data.aiScore}% match.`)
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not run the AI review.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <Button buttonStyle="secondary" disabled={busy} margin={false} onClick={run} size="medium">
        {busy
          ? 'Reviewing resume…'
          : aiStatus === 'pending'
            ? 'Run AI review now'
            : 'Run AI review again'}
      </Button>
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '8px 0 0' }}>
        {aiStatus === 'pending'
          ? 'The review starts automatically when the candidate applies and takes about a minute.'
          : 'Re-scores the resume against the current job posting.'}
      </p>
    </div>
  )
}
