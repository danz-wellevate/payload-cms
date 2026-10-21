'use client'

import { CircleCheck, Upload } from 'lucide-react'
import React, { useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Reads the file as a base64 string. We send JSON rather than multipart/form-data: this app's
// Next.js dev server misroutes any multipart POST into server-action handling (there are no
// server actions in this route group, so the "not an action, fall through" path never kicks in),
// turning every file upload into a 404/500 "Failed to find Server Action" error.
const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })

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
    const name = form.get('name')
    const email = form.get('email')
    const file = form.get('resume')
    try {
      const resume =
        file instanceof File && file.size > 0
          ? { data: await fileToBase64(file), name: file.name, type: file.type }
          : null
      const res = await fetch(`/careers/${encodeURIComponent(slug)}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, resume }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      setSentTo(String(email))
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
        <Input accept={ACCEPT} className="h-auto py-1.5" name="resume" type="file" />
        <span className="text-xs font-normal text-muted-foreground">
          PDF or Word (.docx), up to 5 MB. Optional for now.
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} size="lg" type="submit">
        <Upload /> {busy ? 'Sending…' : 'Submit application'}
      </Button>
    </form>
  )
}
