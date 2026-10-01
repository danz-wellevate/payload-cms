import { notFound } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getPageBySlug } from '@/theme/getSiteData'

// Content lives in Admin → Pages → "Home" (slug: home).
export default async function HomePage() {
  const page = await getPageBySlug('home')
  if (!page) notFound()

  return <RenderBlocks blocks={page.layout} />
}
