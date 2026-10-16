import type { CareersHeroBlock } from '@/payload-types'

import React from 'react'

import { CareersBanner } from '../careers/CareersBanner'

export const CareersHero = ({ block }: { block: CareersHeroBlock }) => (
  <CareersBanner description={block.description} heading={block.heading} />
)
