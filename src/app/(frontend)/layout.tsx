import type { Metadata } from 'next'

import React from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getSiteData, getThemeStyles } from '@/theme/getSiteData'
import './styles.css'

// Always render with the latest CMS content (pages, menus, theme).
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteData()
  const favicon = typeof settings.favicon === 'object' ? settings.favicon?.url : null

  return {
    title: settings.siteName || 'Payload Blank Template',
    description: settings.tagline || 'A blank template using Payload in a Next.js app.',
    icons: favicon ? { icon: favicon } : undefined,
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const { cssVars, fontsHref } = await getThemeStyles()

  return (
    <html lang="en" style={cssVars}>
      <head>
        {fontsHref && (
          <>
            <link href="https://fonts.googleapis.com" rel="preconnect" />
            <link crossOrigin="" href="https://fonts.gstatic.com" rel="preconnect" />
            <link href={fontsHref} rel="stylesheet" />
          </>
        )}
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
