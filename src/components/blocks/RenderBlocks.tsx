import type { Page } from '@/payload-types'

import React from 'react'

import { CallToAction } from './CallToAction'
import { CareersHero } from './CareersHero'
import { ContentStats } from './ContentStats'
import { Features } from './Features'
import { Hero } from './Hero'
import { JobListings } from './JobListings'
import { LatestPosts } from './LatestPosts'

export const RenderBlocks = ({ blocks }: { blocks: Page['layout'] }) => (
  <>
    {blocks?.map((block) => {
      switch (block.blockType) {
        case 'hero':
          return <Hero block={block} key={block.id} />
        case 'features':
          return <Features block={block} key={block.id} />
        case 'contentStats':
          return <ContentStats block={block} key={block.id} />
        case 'latestPosts':
          return <LatestPosts block={block} key={block.id} />
        case 'cta':
          return <CallToAction block={block} key={block.id} />
        case 'careersHero':
          return <CareersHero block={block} key={block.id} />
        case 'jobListings':
          return <JobListings block={block} key={block.id} />
        default:
          return null
      }
    })}
  </>
)
