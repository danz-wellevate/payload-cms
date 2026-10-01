import Link from 'next/link'
import React from 'react'

import { getSiteData } from '@/theme/getSiteData'

import { CMSLink } from './CMSLink'

export async function SiteHeader() {
  const { settings, header } = await getSiteData()
  const logo = typeof settings.logo === 'object' ? settings.logo : null
  const navItems = header.navItems ?? []

  return (
    <header className="siteHeader">
      <div className="container siteHeader__inner">
        <Link className="siteHeader__brand" href="/">
          {logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={logo.alt || settings.siteName} height={36} src={logo.url} />
          ) : (
            <span>{settings.siteName || 'Your Brand'}</span>
          )}
        </Link>

        {navItems.length > 0 && (
          <>
            <input aria-hidden className="siteHeader__toggle" id="nav-toggle" type="checkbox" />
            <label aria-label="Toggle menu" className="siteHeader__burger" htmlFor="nav-toggle">
              <span />
            </label>
            <nav aria-label="Main" className="siteNav">
              <ul>
                {navItems.map((item) => (
                  <li className={item.children?.length ? 'hasChildren' : undefined} key={item.id}>
                    <CMSLink link={item} />
                    {!!item.children?.length && (
                      <ul className="siteNav__submenu">
                        {item.children.map((child) => (
                          <li key={child.id}>
                            <CMSLink link={child} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </div>
    </header>
  )
}
