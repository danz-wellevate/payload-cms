'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Day = { day: string; times: { id: number; time: string }[] }

export const SlotPicker = ({ days, token }: { days: Day[]; token: string }) => {
  const router = useRouter()
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const book = async () => {
    if (selected == null) return
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/schedule/${encodeURIComponent(token)}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: selected }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not book that time.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not book that time.')
      setSelected(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-5">
      {days.map(({ day, times }) => (
        <div className="grid gap-2" key={day}>
          <h3 className="text-sm font-semibold">{day}</h3>
          <div className="flex flex-wrap gap-2">
            {times.map(({ id, time }) => (
              <button
                aria-pressed={selected === id}
                className={cn(
                  'rounded-md border px-3 py-1.5 text-sm transition-colors hover:border-primary',
                  selected === id && 'border-primary bg-primary text-primary-foreground',
                )}
                key={id}
                onClick={() => setSelected(id)}
                type="button"
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className="justify-self-start"
        disabled={selected == null || busy}
        onClick={book}
        size="lg"
      >
        {busy ? 'Booking…' : 'Book this time'}
      </Button>
    </div>
  )
}
