import { getPayload } from 'payload'
import { cache } from 'react'

import config from '@/payload.config'

import { fontStack, googleFontsHref, themeDefaults } from './fonts'

// Cached per request so layout, metadata and pages share one fetch.
export const getSiteData = cache(async () => {
  const payload = await getPayload({ config: await config })

  const [settings, header, footer] = await Promise.all([
    payload.findGlobal({ slug: 'site-settings' }),
    payload.findGlobal({ slug: 'header' }),
    payload.findGlobal({ slug: 'footer' }),
  ])

  return { settings, header, footer }
})

// Picks black or white text for readable contrast on the given hex background.
const contrastText = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.4 ? '#111111' : '#ffffff'
}

export const getThemeStyles = async () => {
  const { settings } = await getSiteData()
  const theme = { ...themeDefaults }
  for (const [key, value] of Object.entries(settings.theme ?? {})) {
    if (value) (theme as Record<string, string>)[key] = value
  }

  return {
    fontsHref: googleFontsHref([theme.headingFont, theme.bodyFont]),
    cssVars: {
      '--font-heading': fontStack(theme.headingFont),
      '--font-body': fontStack(theme.bodyFont),
      '--color-primary': theme.primaryColor,
      '--color-on-primary': contrastText(theme.primaryColor),
      '--color-bg': theme.backgroundColor,
      '--color-surface': theme.surfaceColor,
      '--color-heading': theme.headingColor,
      '--color-text': theme.paragraphColor,
      '--color-text-muted': theme.subParagraphColor,
    } as React.CSSProperties,
  }
}

export const getPageBySlug = cache(async (slug: string) => {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return docs[0] ?? null
})

export const getPosts = cache(async (limit = 24) => {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'posts',
    sort: '-publishedAt',
    limit,
    depth: 1,
    select: { content: false },
  })
  return docs
})

export const getPostBySlug = cache(async (slug: string) => {
  const payload = await getPayload({ config: await config })
  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  return docs[0] ?? null
})
