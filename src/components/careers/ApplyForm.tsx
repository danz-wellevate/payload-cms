'use client'

import { CircleCheck, Upload } from 'lucide-react'
import React, { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Step 1: email + resume. The review runs in the background; the result arrives by email.
export const ApplyForm = ({ slug }: { slug: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const form = new FormData(e.currentTarget)
    try {
      const res = await fetch(`/careers/${encodeURIComponent(slug)}/apply`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      setSentTo(String(form.get('email')))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>Application received</AlertTitle>
        <AlertDescription>
          Thank you! We&apos;re reviewing your resume now. If you match the role, we&apos;ll email{' '}
          <strong>{sentTo}</strong> a link to book your initial interview.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <label className="grid gap-1.5 text-sm font-medium">
        Full name
        <Input autoComplete="name" name="name" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Email
        <Input autoComplete="email" name="email" required type="email" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Resume / CV
        <Input accept={ACCEPT} className="h-auto py-1.5" name="resume" required type="file" />
        <span className="text-xs font-normal text-muted-foreground">
          PDF or Word (.docx), up to 5 MB.
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} size="lg" type="submit">
        <Upload /> {busy ? 'Sending…' : 'Submit application'}
      </Button>
    </form>
  )
}
