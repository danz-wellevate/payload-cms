import type { Metadata } from 'next'

import { ArrowLeft, Briefcase, MapPin } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { RichText } from '@payloadcms/richtext-lexical/react'

import { getPayloadClient } from '@/assessment/server'
import { ApplyForm } from '@/components/careers/ApplyForm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DEPARTMENT_BADGE_STYLES, departmentLabel } from '@/lib/departments'
import { cn } from '@/lib/utils'
import '@/styles/shadcn.css'

type Args = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

const findJob = async (slug: string) => {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'jobs',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'open' } }] },
    limit: 1,
    depth: 0,
  })
  return docs[0]
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const job = await findJob((await params).slug)
  return { title: job ? `${job.title} | Careers` : 'Careers' }
}

export default async function JobPage({ params }: Args) {
  const job = await findJob((await params).slug)
  if (!job) notFound()

  return (
    <div className="shadcn mx-auto w-full max-w-[var(--container)] px-6 py-12 md:py-16">
      <Link
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        href="/careers"
      >
        <ArrowLeft className="size-4" /> All positions
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">{job.title}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.department && (
          <Badge className={cn(DEPARTMENT_BADGE_STYLES[job.department])} variant="outline">
            {departmentLabel(job.department)}
          </Badge>
        )}
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
      </div>
      {job.summary && <p className="mt-4 text-muted-foreground">{job.summary}</p>}

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_minmax(0,22rem)] md:items-start">
        <div className="grid gap-6">
          <section>
            <h2 className="text-lg font-semibold">Qualifications</h2>
            <div className="richtext mt-3">
              <RichText data={job.qualifications} />
            </div>
          </section>
          <section className="border-t pt-6">
            <h2 className="text-lg font-semibold">Required skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(job.requiredSkills ?? []).map(({ skill, id }) => (
                <Badge key={id ?? skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        <Card className="md:sticky md:top-24 md:self-start">
          <CardHeader>
            <CardTitle className="text-lg">Apply for this job</CardTitle>
            <CardDescription>
              We compare your resume with the qualifications and skills listed here, then email you
              about the next step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplyForm slug={job.slug ?? ''} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
