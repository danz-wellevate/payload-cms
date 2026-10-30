'use client'

import { useRowLabel } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

import { withBase } from '@/lib/basePath'

type Row = {
  title?: string
  savedQuestion?: number | string | { id: number | string; name?: string } | null
}

// Remembers names already fetched so collapsing/expanding rows doesn't refetch.
const names = new Map<string, string>()

// Row heading for the Tasks list: the saved question's name when one is used, otherwise the
// task title, otherwise "Task 01".
export const TaskRowLabel = () => {
  const { data, rowNumber } = useRowLabel<Row>()
  const raw = data?.savedQuestion
  const id = raw && typeof raw === 'object' ? raw.id : raw
  const key = id == null ? null : String(id)

  const [savedName, setSavedName] = useState<string | undefined>(key ? names.get(key) : undefined)

  useEffect(() => {
    if (!key) {
      setSavedName(undefined)
      return
    }
    const cached = names.get(key)
    if (cached) {
      setSavedName(cached)
      return
    }
    let cancelled = false
    fetch(withBase(`/api/saved-questions/${key}?depth=0`), { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((question) => {
        if (!question?.name) return
        names.set(key, question.name)
        if (!cancelled) setSavedName(question.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [key])

  const number = String((rowNumber ?? 0) + 1).padStart(2, '0')
  // Title first, so renaming a task here shows right away; the saved question's name is used
  // until the title is filled in (e.g. just after picking one).
  return <span>{data?.title || savedName || `Task ${number}`}</span>
}
