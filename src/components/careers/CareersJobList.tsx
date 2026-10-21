'use client'

import type { Job } from '@/payload-types'

import { ArrowRight, Briefcase, MapPin } from 'lucide-react'
import Link from 'next/link'
import React, { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { DEPARTMENT_BADGE_STYLES, DEPARTMENTS, departmentLabel } from '@/lib/departments'

type Props = {
  jobs: Job[]
  heading?: string | null
  subheading?: string | null
}

export function CareersJobList({ jobs, heading, subheading }: Props) {
  const [department, setDepartment] = useState<string>('all')

  const availableDepartments = useMemo(() => {
    const present = new Set(jobs.map((job) => job.department).filter(Boolean))
    return DEPARTMENTS.filter(({ value }) => present.has(value))
  }, [jobs])

  const filteredJobs = useMemo(
    () => (department === 'all' ? jobs : jobs.filter((job) => job.department === department)),
    [jobs, department],
  )

  return (
    <div className="shadcn container job-list__wrapper">
      {(heading || subheading) && (
        <div className="job-list__heading">
          {heading && <h2>{heading}</h2>}
          {subheading && <p className="muted">{subheading}</p>}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-2">
        <Button
          onClick={() => setDepartment('all')}
          size="sm"
          variant={department === 'all' ? 'default' : 'outline'}
        >
          All departments
        </Button>
        {availableDepartments.map(({ label, value }) => (
          <Button
            key={value}
            onClick={() => setDepartment(value)}
            size="sm"
            variant={department === value ? 'default' : 'outline'}
          >
            {label}
          </Button>
        ))}
      </div>

      {filteredJobs.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          {jobs.length === 0
            ? 'There are no open positions right now. Please check back later.'
            : 'No open positions in this department right now.'}
        </p>
      ) : (
        <div className="job-list__grid">
          {filteredJobs.map((job) => (
            <Link className="group" href={`/careers/${job.slug}`} key={job.id}>
              <Card className="transition-colors group-hover:border-primary">
                <CardHeader>
                  {job.department && (
                    <Badge
                      className={cn('mb-1 w-fit', DEPARTMENT_BADGE_STYLES[job.department])}
                      variant="outline"
                    >
                      {departmentLabel(job.department)}
                    </Badge>
                  )}
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
