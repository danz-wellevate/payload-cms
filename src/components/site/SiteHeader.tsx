import Link from 'next/link'
import React from 'react'

import { getSiteData } from '@/theme/getSiteData'
import { withBase } from '@/lib/basePath'

export async function SiteHeader() {
  const { settings, header } = await getSiteData()
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

        <input aria-hidden className="siteHeader__toggle" id="nav-toggle" type="checkbox" />
        <label aria-label="Toggle menu" className="siteHeader__burger" htmlFor="nav-toggle">
          <span />
        </label>
        {header.mainWebsiteUrl && (
          <nav aria-label="Main" className="siteNav">
            <ul>
              <li>
                <a href={header.mainWebsiteUrl}>Go to Main website</a>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  )
}
