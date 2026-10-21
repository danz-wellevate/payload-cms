import Link from 'next/link'
import React from 'react'

import { getSiteData } from '@/theme/getSiteData'

import { CMSLink } from './CMSLink'

export async function SiteFooter() {
  const { settings, header } = await getSiteData()
  const logo = typeof settings.logo === 'object' ? settings.logo : null
  const links = header.navItems ?? []

  return (
    <footer className="siteFooter">
      <div className="container siteFooter__inner">
        <Link className="siteFooter__brand" href="/">
          {logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={logo.alt || settings.siteName} height={28} src={logo.url} />
          ) : (
            <span>{settings.siteName || 'Your Brand'}</span>
          )}
        </Link>

        {links.length > 0 && (
          <ul className="siteFooter__links">
            {links.map((link) => (
              <li key={link.id}>
                <CMSLink link={link} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  )
}
