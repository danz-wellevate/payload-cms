'use client'

import { toast, useForm } from '@payloadcms/ui'
import React, { useState } from 'react'

import { withBase } from '@/lib/basePath'

type LexicalNode = { type?: string; children?: unknown[] }

// An empty editor still holds one empty paragraph, so look for real content.
const hasRichText = (value: unknown) => {
  const children = (value as { root?: { children?: LexicalNode[] } } | null)?.root?.children ?? []
  return children.some((node) => node.type !== 'paragraph' || (node.children?.length ?? 0) > 0)
}

// Bookmark shown at the bottom of each task. Clicking it saves the task's question, expected
// output and test input into Saved Questions so it can be reused in other assessments.
export const SaveQuestionButton = ({ path }: { path: string }) => {
  const { getData } = useForm()
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')

  const save = async () => {
    // path looks like "tasks.0.saveQuestion"
    const segments = path.split('.')
    const index = Number(segments[segments.length - 2])
    const row = (getData() as { tasks?: Record<string, any>[] }).tasks?.[index]
    if (!row) return

    if (row.savedQuestion) {
      toast.info('This task already comes from a saved question.')
      return
    }

    const answers: string[] = (row.acceptedAnswers ?? [])
      .map((item: { answer?: string }) => item?.answer)
      .filter(Boolean)
    if (!hasRichText(row.prompt) || answers.length === 0) {
      toast.error('Add the question and at least one expected output first.')
      return
    }

    const name = window.prompt('Name for this saved question', row.title || '')?.trim()
    if (!name) return

    setState('saving')
    try {
      const res = await fetch(withBase('/api/saved-questions'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          prompt: row.prompt,
          testInput: row.testInput || undefined,
          caseSensitive: Boolean(row.caseSensitive),
          acceptedAnswers: answers.map((answer) => ({ answer })),
        }),
      })
      if (!res.ok) throw new Error()
      setState('saved')
      toast.success(`Saved “${name}” to Saved Questions.`)
    } catch {
      setState('idle')
      toast.error('Could not save the question. Please try again.')
    }
  }

  const saved = state === 'saved'
  return (
    <button
      aria-label="Save this task to Saved Questions"
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
      title="Save to Saved Questions"
      type="button"
    >
      <svg
        fill={saved ? 'currentColor' : 'none'}
        height="22"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        width="22"
      >
        <path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z" />
      </svg>
      <span>
        {state === 'saving'
          ? 'Saving…'
          : saved
            ? 'Saved to Saved Questions'
            : 'Save to Saved Questions'}
      </span>
    </button>
  )
}
