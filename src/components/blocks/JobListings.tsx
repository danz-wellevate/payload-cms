import type { JobListingsBlock } from '@/payload-types'

import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { CareersJobList } from '../careers/CareersJobList'

export const JobListings = async ({ block }: { block: JobListingsBlock }) => {
  const payload = await getPayload({ config: await config })
  const { docs: jobs } = await payload.find({
    collection: 'jobs',
    where: { status: { equals: 'open' } },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
  })
  return <CareersJobList heading={block.heading} jobs={jobs} subheading={block.subheading} />
}
