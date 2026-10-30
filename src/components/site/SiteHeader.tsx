import Link from 'next/link'
import React from 'react'

import { getSiteData } from '@/theme/getSiteData'
import { withBase } from '@/lib/basePath'

// Navigation is disabled for now — just the logo.
export async function SiteHeader() {
  const { settings } = await getSiteData()
  const logo = typeof settings.logo === 'object' ? settings.logo : null

  return (
    <header className="siteHeader">
      <div className="container siteHeader__inner">
        <Link className="siteHeader__brand" href="/">
          {logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={logo.alt || settings.siteName} height={36} src={withBase(logo.url)} />
          ) : (
            <span>{settings.siteName || 'Your Brand'}</span>
          )}
        </Link>
      </div>
    </header>
  )
}
