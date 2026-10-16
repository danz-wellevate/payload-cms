import type { Job } from '@/payload-types'

import { ArrowRight, Briefcase, MapPin } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  jobs: Job[]
  heading?: string | null
  subheading?: string | null
}

export function CareersJobList({ jobs, heading, subheading }: Props) {
  return (
    <div className="shadcn container py-12">
      {(heading || subheading) && (
        <div className="job-list__heading">
          {heading && <h2>{heading}</h2>}
          {subheading && <p className="muted">{subheading}</p>}
        </div>
      )}
      {jobs.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          There are no open positions right now. Please check back later.
        </p>
      ) : (
        <div className="job-list__grid">
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
      )}
    </div>
  )
}
