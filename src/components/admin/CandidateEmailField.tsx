'use client'

import { FieldLabel, useConfig, useField } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

type Suggestion = { id: number | string; email: string; name?: string }

// One combined control for "who is this assessment for": type an email to search existing
// applicants, pick one to link it, or just keep typing a new address — it's created
// automatically on save. Replaces having a separate email text field and an "applicant"
// relationship dropdown that had to be kept in sync by hand.
export const CandidateEmailField = () => {
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const emailField = useField<string>({ path: 'candidateEmail' })
  const applicantField = useField<number | string>({ path: 'applicant' })
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const search = async (text: string) => {
    if (text.trim().length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        'where[email][contains]': text.trim(),
        limit: '8',
        depth: '0',
      })
      const res = await fetch(`${api}/applicants?${params.toString()}`, { credentials: 'include' })
      const data = await res.json().catch(() => null)
      setSuggestions(
        (data?.docs ?? []).map((doc: { id: number | string; email: string; name?: string }) => ({
          id: doc.id,
          email: doc.email,
          name: doc.name,
        })),
      )
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const onChange = (text: string) => {
    emailField.setValue(text)
    if (applicantField.value) applicantField.setValue(null)
    setOpen(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(text), 300)
  }

  const select = (s: Suggestion) => {
    emailField.setValue(s.email)
    applicantField.setValue(s.id)
    setSuggestions([])
    setOpen(false)
  }

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const linked = Boolean(applicantField.value)
  const isNew = Boolean(emailField.value) && !linked

  return (
    <div
      className="field-type"
      ref={containerRef}
      style={{ marginBottom: 'var(--base)', position: 'relative' }}
    >
      <FieldLabel label="Candidate email" required />
      <input
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="candidate@example.com"
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--theme-input-bg)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 4,
        }}
        type="email"
        value={emailField.value ?? ''}
      />
      {open && (loading || suggestions.length > 0) && (
        <div
          style={{
            background: 'var(--theme-elevation-0)',
            border: '1px solid var(--theme-elevation-150)',
            borderRadius: 4,
            left: 0,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 10,
          }}
        >
          {loading && (
            <div style={{ color: 'var(--theme-elevation-500)', padding: '8px 12px' }}>
              Searching…
            </div>
          )}
          {!loading &&
            suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => select(s)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'block',
                  padding: '8px 12px',
                  textAlign: 'left',
                  width: '100%',
                }}
                type="button"
              >
                {s.name ? `${s.name} — ${s.email}` : s.email}
              </button>
            ))}
        </div>
      )}
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '6px 0 0' }}>
        {linked
          ? 'Linked to an existing applicant account.'
          : isNew
            ? "No applicant account yet — one is created automatically on save. Set a password in the sidebar to let them sign in right away."
            : 'Search for an existing applicant, or type a new email to invite someone new.'}
      </p>
    </div>
  )
}
