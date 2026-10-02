'use client'

import {
  Button,
  ConfirmationModal,
  toast,
  useConfig,
  useDocumentInfo,
  useFormFields,
  useModal,
} from '@payloadcms/ui'
import React from 'react'

// Sidebar button that wipes the current attempt so the candidate can take the exam again.
export const ResetAssessmentButton = () => {
  const { id } = useDocumentInfo()
  const { openModal } = useModal()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const status = useFormFields(([fields]) => fields.status?.value as string | undefined)
  const name = useFormFields(([fields]) => fields.candidateName?.value as string | undefined)

  if (!id) return null

  const modalSlug = `reset-assessment-${id}`

  const reset = async () => {
    const res = await fetch(`${api}/assessments/${id}/reset`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error ?? 'Could not reset the assessment.')
      return
    }
    toast.success('Assessment reset. The candidate can start again.')
    // Reload so every field shows the cleared values.
    window.location.reload()
  }

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <Button
        buttonStyle="secondary"
        margin={false}
        onClick={() => openModal(modalSlug)}
        size="medium"
      >
        Reset assessment
      </Button>
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '8px 0 0' }}>
        {status === 'in_progress'
          ? 'The candidate is taking this exam right now. Resetting ends their attempt.'
          : 'Lets the candidate take the exam again with the same link.'}
      </p>
      <ConfirmationModal
        body={
          <>
            <p>
              This permanently deletes {name ? `${name}'s` : 'the candidate’s'} submitted code,
              result, feedback, timing, integrity counts, activity timeline and webcam snapshots.
            </p>
            <p>The exam goes back to &ldquo;Invited&rdquo; and keeps the same invite link.</p>
          </>
        }
        confirmLabel="Reset assessment"
        heading="Reset this assessment?"
        modalSlug={modalSlug}
        onConfirm={reset}
      />
    </div>
  )
}
