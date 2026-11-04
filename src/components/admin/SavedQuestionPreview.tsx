'use client'

import { useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { withBase } from '@/lib/basePath'

type LexicalNode = { text?: string; type?: string; children?: LexicalNode[] }
type Question = {
  name?: string
  prompt?: { root?: LexicalNode }
  testInput?: string | null
  caseSensitive?: boolean
  acceptedAnswers?: { answer?: string }[]
}

// Flattens the rich text into plain lines for the preview.
const toText = (node?: LexicalNode): string => {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  const parts = (node.children ?? []).map(toText)
  const block = ['paragraph', 'heading', 'listitem', 'quote'].includes(node.type ?? '')
  return block ? `${parts.join('')}\n` : parts.join('')
}

// Shown under the "Use a saved question" picker, so the chosen question can be seen right away.
// (Its content is copied into the task fields when the assessment is saved.)
export const SavedQuestionPreview = ({ path }: { path: string }) => {
  const rowPath = path.split('.').slice(0, -1).join('.')
  const linked = useFormFields(([fields]) => fields[`${rowPath}.savedQuestion`]?.value) as
    | number
    | string
    | { id: number | string }
    | null
    | undefined
  const id = linked && typeof linked === 'object' ? linked.id : linked

  const [question, setQuestion] = useState<Question | null>(null)

  useEffect(() => {
    if (id == null || id === '') {
      setQuestion(null)
      return
    }
    let cancelled = false
    fetch(withBase(`/api/saved-questions/${id}?depth=0`), { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setQuestion(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  if (!question) return null

  const answers = (question.acceptedAnswers ?? []).map((item) => item.answer).filter(Boolean)

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 4,
        marginBottom: '1.5rem',
        padding: '0.75rem 1rem',
      }}
    >
      <p style={{ fontSize: '0.8rem', margin: 0, opacity: 0.7 }}>
        Saved question in the library — its content is copied into this task when you save the
        assessment.
      </p>
      <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>{question.name}</p>
      <p style={{ margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>
        {toText(question.prompt?.root).trim()}
      </p>
      <p style={{ fontSize: '0.85rem', margin: 0 }}>
        <strong>Expected output:</strong>{' '}
        {answers.length ? answers.join('  |  ') : 'none (any output that runs is accepted)'}
        {question.testInput ? (
          <>
            {' '}
            · <strong>Test input:</strong> {question.testInput}
          </>
        ) : null}
      </p>
    </div>
  )
}
