'use client'

import { toast, useForm, useFormFields } from '@payloadcms/ui'
import React, { useState } from 'react'

import { withBase } from '@/lib/basePath'

type LexicalNode = { type?: string; children?: unknown[] }

// An empty editor still holds one empty paragraph, so look for real content.
const hasRichText = (value: unknown) => {
  const children = (value as { root?: { children?: LexicalNode[] } } | null)?.root?.children ?? []
  return children.some((node) => node.type !== 'paragraph' || (node.children?.length ?? 0) > 0)
}

// Bookmark shown at the bottom of each task.
//  - Task typed by hand: saves it into Saved Questions so it can be reused in other assessments.
//  - Task that uses a saved question: pushes the edits made here back into that saved question.
export const SaveQuestionButton = ({ path }: { path: string }) => {
  const { getData } = useForm()
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // path looks like "tasks.0.saveQuestion"
  const segments = path.split('.')
  const rowPath = segments.slice(0, -1).join('.')
  const index = Number(segments[segments.length - 2])

  // Reactive: switches the button between "save" and "update" as the picker changes.
  const linked = useFormFields(([fields]) => fields[`${rowPath}.savedQuestion`]?.value) as
    | number
    | string
    | { id: number | string }
    | null
    | undefined
  const savedId = linked && typeof linked === 'object' ? linked.id : linked
  const isUpdate = savedId != null && savedId !== ''

  const send = async (method: 'POST' | 'PATCH', url: string, body: unknown) => {
    const res = await fetch(withBase(url), {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error()
  }

  const save = async () => {
    const row = (getData() as { tasks?: Record<string, any>[] }).tasks?.[index]
    if (!row) return

    // An empty array field comes through as the number 0, so only use it when it's a real list.
    const rawAnswers: { answer?: string }[] = Array.isArray(row.acceptedAnswers)
      ? row.acceptedAnswers
      : []
    const answers: string[] = rawAnswers.map((item) => item?.answer ?? '').filter(Boolean)

    if (!hasRichText(row.prompt)) {
      toast.error('Write the question first.')
      return
    }

    const content = {
      prompt: row.prompt,
      testInput: row.testInput || null,
      caseSensitive: Boolean(row.caseSensitive),
      acceptedAnswers: answers.map((answer) => ({ answer })),
    }

    if (isUpdate) {
      const ok = window.confirm(
        'Update the saved question now with the changes made here?\n\n(Saving the assessment also does this.) Assessments that already used it keep their own copy.',
      )
      if (!ok) return

      setState('saving')
      try {
        await send('PATCH', `/api/saved-questions/${savedId}`, {
          ...content,
          ...(row.title ? { name: row.title } : {}),
        })
        setState('saved')
        toast.success('Saved question updated.')
      } catch {
        setState('idle')
        toast.error('Could not update the saved question. Please try again.')
      }
      return
    }

    const name = window.prompt('Name for this saved question', row.title || '')?.trim()
    if (!name) return

    setState('saving')
    try {
      await send('POST', '/api/saved-questions', { name, ...content })
      setState('saved')
      toast.success(`Saved “${name}” to Saved Questions.`)
    } catch {
      setState('idle')
      toast.error('Could not save the question. Please try again.')
    }
  }

  const saved = state === 'saved'
  const label =
    state === 'saving'
      ? 'Saving…'
      : saved
        ? isUpdate
          ? 'Saved question updated'
          : 'Saved to Saved Questions'
        : isUpdate
          ? 'Update saved question'
          : 'Save to Saved Questions'

  return (
    <button
      aria-label={isUpdate ? 'Update the saved question' : 'Save this task to Saved Questions'}
      disabled={state === 'saving'}
      onClick={save}
      style={{
        alignItems: 'center',
        background: 'none',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: '0.5rem',
        padding: 0,
      }}
      title={isUpdate ? 'Update the saved question' : 'Save to Saved Questions'}
      type="button"
    >
      <svg
        fill={saved || isUpdate ? 'currentColor' : 'none'}
        height="22"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="22"
      >
        <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
