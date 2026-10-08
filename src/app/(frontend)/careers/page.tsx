import type { Metadata } from 'next'

import { ArrowRight, Briefcase, MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { getPayloadClient } from '@/assessment/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import '@/styles/shadcn.css'

export const metadata: Metadata = { title: 'Careers' }
export const dynamic = 'force-dynamic'

export default async function CareersPage() {
  const payload = await getPayloadClient()
  const { docs: jobs } = await payload.find({
    collection: 'jobs',
    where: { status: { equals: 'open' } },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
  })

  return (
    <div className="shadcn mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Careers</p>
      <h1 className="mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">Open positions</h1>
      <p className="mt-2 text-muted-foreground">
        Apply with your email and resume. We review every application and email you about the next
        step.
      </p>

      <div className="mt-8 grid gap-4">
        {jobs.length === 0 && (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            There are no open positions right now. Please check back later.
          </p>
        )}
        {jobs.map((job) => (
          <Link className="group" href={`/careers/${job.slug}`} key={job.id}>
            <Card className="transition-colors group-hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-4 text-xl">
                  {job.title}
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </CardTitle>
                {job.summary && <CardDescription>{job.summary}</CardDescription>}
              </CardHeader>
              {(job.location || job.employmentType) && (
                <CardContent className="flex flex-wrap gap-2">
                  {job.location && (
                    <Badge variant="secondary">
                      <MapPin /> {job.location}
                    </Badge>
                  )}
                  {job.employmentType && (
                    <Badge variant="secondary">
                      <Briefcase /> {job.employmentType}
                    </Badge>
                  )}
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
