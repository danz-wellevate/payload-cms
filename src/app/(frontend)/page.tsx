import type { Metadata } from 'next'

import React from 'react'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getPageBySlug, getSiteData } from '@/theme/getSiteData'
import '@/styles/shadcn.css'

export async function generateMetadata(): Promise<Metadata> {
  const [page, { settings }] = await Promise.all([getPageBySlug('home'), getSiteData()])
  if (!page) return { title: 'Home' }
  return { title: settings.siteName ? `${page.title} | ${settings.siteName}` : page.title }
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const page = await getPageBySlug('home')
  if (!page) return null

  return <RenderBlocks blocks={page.layout} />
}
