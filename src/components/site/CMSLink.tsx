import Link from 'next/link'
import React from 'react'

export type CMSLinkData = { label?: string | null; url?: string | null; newTab?: boolean | null }

export const CMSLink = ({ link, className }: { link: CMSLinkData; className?: string }) => {
  if (!link.url || !link.label) return null

  return (
    <Link
      className={className}
      href={link.url}
      {...(link.newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
    >
      {link.label}
    </Link>
  )
}
