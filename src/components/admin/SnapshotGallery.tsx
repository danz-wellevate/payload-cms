'use client'

import type { ProctoringSnapshot } from '@/payload-types'

import { FieldLabel, useDocumentInfo } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })

// Grid of the webcam snapshots taken during this assessment (from before video recording).
export const SnapshotGallery = () => {
  const { id } = useDocumentInfo()
  const [snapshots, setSnapshots] = useState<ProctoringSnapshot[] | null>(null)

  useEffect(() => {
    if (!id) return
    const params = new URLSearchParams({
      'where[assessment][equals]': String(id),
      sort: 'takenAt',
      limit: '500',
      depth: '0',
    })
    fetch(`/api/proctoring-snapshots?${params}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setSnapshots(data.docs ?? []))
      .catch(() => setSnapshots([]))
  }, [id])

  // Snapshots were replaced by video recording; only show older assessments that have some.
  if (!id || !snapshots || snapshots.length === 0) return null

  return (
    <div className="field-type" style={{ marginBottom: 'calc(var(--base) * 2)' }}>
      <FieldLabel label={`Webcam snapshots (${snapshots.length})`} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {snapshots.map((snapshot) => (
          <a
            href={snapshot.url ?? undefined}
            key={snapshot.id}
            rel="noreferrer"
            style={{ color: 'inherit', textDecoration: 'none' }}
            target="_blank"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`Snapshot at ${formatTime(snapshot.takenAt)}`}
              src={snapshot.url ?? ''}
              style={{
                width: '100%',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                borderRadius: 4,
                background: 'var(--theme-elevation-100)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--theme-elevation-600)' }}>
              {formatTime(snapshot.takenAt)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
