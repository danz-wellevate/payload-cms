export const sectionClass = (background?: string | null) =>
  background === 'surface' ? 'section section--surface' : 'section'

export const paragraphs = (text?: string | null) =>
  (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

export const anchor = (blockName?: string | null) =>
  blockName
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || undefined
