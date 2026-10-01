import type { Metadata } from 'next'

import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { RenderBlocks } from '@/components/blocks/RenderBlocks'
import { getPageBySlug, getSiteData } from '@/theme/getSiteData'

type Args = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const [page, { settings }] = await Promise.all([getPageBySlug(slug), getSiteData()])
  if (!page) return {}

  return { title: settings.siteName ? `${page.title} | ${settings.siteName}` : page.title }
}

export default async function Page({ params }: Args) {
  const { slug } = await params
  if (slug === 'home') redirect('/')

  const page = await getPageBySlug(slug)
  if (!page) notFound()

  return <RenderBlocks blocks={page.layout} />
}
