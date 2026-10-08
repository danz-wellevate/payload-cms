import type { Metadata } from 'next'

import { CalendarCheck, CalendarX } from 'lucide-react'
import React from 'react'

import type { Job } from '@/payload-types'

import { getPayloadClient } from '@/assessment/server'
import { SlotPicker } from '@/components/careers/SlotPicker'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime, HIRING_TIME_ZONE } from '@/recruitment/format'
import { findApplicationByToken, findOpenSlots } from '@/recruitment/server'
import '@/styles/shadcn.css'

export const metadata: Metadata = { title: 'Book your interview', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ token: string }> }

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: HIRING_TIME_ZONE,
  })

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { timeStyle: 'short', timeZone: HIRING_TIME_ZONE })

// Step 4: opened from the link in the "book your initial interview" email.
export default async function SchedulePage({ params }: Args) {
  const { token } = await params
  const payload = await getPayloadClient()
  const application = await findApplicationByToken(payload, token)

  const shell = (children: React.ReactNode) => (
    <div className="shadcn mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">
        Initial interview
      </p>
      {children}
    </div>
  )

  if (!application) {
    return shell(
      <Alert className="mt-6" variant="destructive">
        <CalendarX />
        <AlertTitle>This link is not valid</AlertTitle>
        <AlertDescription>Please use the link from your email.</AlertDescription>
      </Alert>,
    )
  }

  const job = application.job as Job
  const heading = (
    <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
      {job.title}
      <span className="mt-1 block text-base font-normal text-muted-foreground">
        {application.name || application.email}
      </span>
    </h1>
  )

  if (application.initialInterviewAt) {
    return shell(
      <>
        {heading}
        <Alert className="mt-6" variant="success">
          <CalendarCheck />
          <AlertTitle>Your interview is booked</AlertTitle>
          <AlertDescription>
            {formatDateTime(application.initialInterviewAt)}. We emailed you a confirmation. To
            change the time, reply to that email.
          </AlertDescription>
        </Alert>
      </>,
    )
  }

  if (application.stage !== 'invited_to_schedule') {
    return shell(
      <>
        {heading}
        <Alert className="mt-6">
          <CalendarX />
          <AlertTitle>Booking isn&apos;t open for this application</AlertTitle>
          <AlertDescription>We&apos;ll email you if anything changes.</AlertDescription>
        </Alert>
      </>,
    )
  }

  const { docs: slots } = await findOpenSlots(payload)
  const days = new Map<string, { id: number; time: string }[]>()
  for (const slot of slots) {
    const day = dayOf(slot.startsAt)
    days.set(day, [...(days.get(day) ?? []), { id: slot.id, time: timeOf(slot.startsAt) }])
  }

  return shell(
    <>
      {heading}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Choose a time</CardTitle>
          <CardDescription>
            Times are shown in {HIRING_TIME_ZONE.replace(/_/g, ' ')} time. Each interview takes
            about {slots[0]?.durationMinutes ?? 30} minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slots.length ? (
            <SlotPicker days={[...days].map(([day, times]) => ({ day, times }))} token={token} />
          ) : (
            <p className="text-sm text-muted-foreground">
              There are no open times right now. Please check this page again later; new times are
              added regularly.
            </p>
          )}
        </CardContent>
      </Card>
    </>,
  )
}
