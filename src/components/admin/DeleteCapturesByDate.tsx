'use client'

import { ConfirmationModal, toast, useConfig, useModal } from '@payloadcms/ui'
import { CalendarX2, Trash2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { CAPTURE_RETENTION_DAYS } from '@/assessment/captures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import '@/styles/shadcn.css'

import { dayKey, dayRange, formatDay } from './captureDates'

type Counts = { recordings: number; snapshots: number }

const MODAL_SLUG = 'delete-captures-by-date'

// Shown above the Webcam Recordings / Snapshots lists: deletes every capture from one day
// across all assessments.
export const DeleteCapturesByDate = () => {
  const { openModal } = useModal()
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const [date, setDate] = useState(() => dayKey(new Date()))
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    if (!date) return setCounts(null)
    const { from, to } = dayRange(date)
    const count = async (collection: string, field: string) => {
      const params = new URLSearchParams({
        [`where[${field}][greater_than_equal]`]: from.toISOString(),
        [`where[${field}][less_than]`]: to.toISOString(),
        limit: '1',
        depth: '0',
      })
      const res = await fetch(`${api}/${collection}?${params}`, { credentials: 'include' })
      return ((await res.json().catch(() => ({}))).totalDocs as number) ?? 0
    }
    let cancelled = false
    setCounts(null)
    void Promise.all([
      count('proctoring-recordings', 'startedAt'),
      count('proctoring-snapshots', 'takenAt'),
    ]).then(([recordings, snapshots]) => !cancelled && setCounts({ recordings, snapshots }))
    return () => {
      cancelled = true
    }
  }, [api, date])

  const total = counts ? counts.recordings + counts.snapshots : 0

  const deleteDay = async () => {
    const { from, to } = dayRange(date)
    const res = await fetch(`${api}/proctoring-recordings/delete-range`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from.toISOString(), to: to.toISOString() }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error ?? 'Could not delete the captures.')
      return
    }
    toast.success(
      `Deleted ${data.recordings} recording(s) and ${data.snapshots} snapshot(s) from ${formatDay(date)}.`,
    )
    window.location.reload()
  }

  return (
    <div className="shadcn shadcn-admin mb-6 text-[13px]">
      <Card className="gap-4 py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-[16px]">
            <CalendarX2 className="size-4" /> Delete captures by date
          </CardTitle>
          <CardDescription className="text-[13px]">
            Removes every webcam recording and snapshot captured on the chosen day, for all
            candidates. Captures older than {CAPTURE_RETENTION_DAYS} days are deleted automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 px-5">
          <Input
            aria-label="Date"
            className="h-9 w-auto text-[13px] md:text-[13px]"
            max={dayKey(new Date())}
            onChange={(e) => setDate(e.target.value)}
            type="date"
            value={date}
          />
          <Button
            className="text-[13px]"
            disabled={!counts || total === 0}
            onClick={() => openModal(MODAL_SLUG)}
            type="button"
            variant="destructive"
          >
            <Trash2 />
            {!date
              ? 'Pick a date'
              : !counts
                ? 'Counting…'
                : total === 0
                  ? 'Nothing captured on this day'
                  : `Delete ${counts.recordings} recording${counts.recordings === 1 ? '' : 's'}` +
                    (counts.snapshots
                      ? ` and ${counts.snapshots} snapshot${counts.snapshots === 1 ? '' : 's'}`
                      : '')}
          </Button>
        </CardContent>
      </Card>

      {date && counts && (
        <ConfirmationModal
          body={`This permanently deletes ${counts.recordings} recording(s) and ${counts.snapshots} snapshot(s) captured on ${formatDay(date)}, for every candidate. This can't be undone.`}
          confirmLabel="Delete captures"
          heading={`Delete captures from ${formatDay(date)}?`}
          modalSlug={MODAL_SLUG}
          onConfirm={deleteDay}
        />
      )}
    </div>
  )
}
