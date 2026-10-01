import React from 'react'

import { getSiteData } from '@/theme/getSiteData'

import { CMSLink } from './CMSLink'

export async function SiteFooter() {
  const { settings, footer } = await getSiteData()
  const columns = footer.columns ?? []
  const copyright =
    footer.copyright || `© ${new Date().getFullYear()} ${settings.siteName || 'Your Brand'}`

  return (
    <footer className="siteFooter">
      <div className="container">
        <div className="siteFooter__grid">
          <div>
            <p className="siteFooter__brand">{settings.siteName || 'Your Brand'}</p>
            {settings.tagline && <p className="muted">{settings.tagline}</p>}
          </div>
          {columns.map((column) => (
            <div key={column.id}>
              {column.heading && <h4>{column.heading}</h4>}
              <ul>
                {column.links?.map((link) => (
                  <li key={link.id}>
                    <CMSLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="siteFooter__copyright muted">{copyright}</p>
      </div>
    </footer>
  )
}
