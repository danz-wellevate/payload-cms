// Google Fonts available in General Settings → Theme.
// To add a font, append an entry here; the admin select and frontend loader both read this list.
export const themeFonts = [
  { label: 'Inter', value: 'inter', family: 'Inter', fallback: 'sans-serif' },
  { label: 'Roboto', value: 'roboto', family: 'Roboto', fallback: 'sans-serif' },
  { label: 'Open Sans', value: 'open-sans', family: 'Open Sans', fallback: 'sans-serif' },
  { label: 'Lato', value: 'lato', family: 'Lato', fallback: 'sans-serif' },
  { label: 'Montserrat', value: 'montserrat', family: 'Montserrat', fallback: 'sans-serif' },
  { label: 'Poppins', value: 'poppins', family: 'Poppins', fallback: 'sans-serif' },
  { label: 'DM Sans', value: 'dm-sans', family: 'DM Sans', fallback: 'sans-serif' },
  { label: 'Space Grotesk', value: 'space-grotesk', family: 'Space Grotesk', fallback: 'sans-serif' },
  { label: 'Playfair Display', value: 'playfair-display', family: 'Playfair Display', fallback: 'serif' },
  { label: 'Merriweather', value: 'merriweather', family: 'Merriweather', fallback: 'serif' },
  { label: 'Lora', value: 'lora', family: 'Lora', fallback: 'serif' },
  { label: 'Source Serif 4', value: 'source-serif-4', family: 'Source Serif 4', fallback: 'serif' },
  { label: 'System UI', value: 'system', family: null, fallback: 'system-ui, sans-serif' },
] as const

export type ThemeFontValue = (typeof themeFonts)[number]['value']

export const themeDefaults = {
  headingFont: 'poppins',
  bodyFont: 'inter',
  primaryColor: '#4f46e5',
  backgroundColor: '#ffffff',
  surfaceColor: '#f5f5f7',
  headingColor: '#111827',
  paragraphColor: '#374151',
  subParagraphColor: '#6b7280',
} as const

export const getThemeFont = (value?: string | null) =>
  themeFonts.find((font) => font.value === value) ?? themeFonts[0]

export const fontStack = (value?: string | null) => {
  const font = getThemeFont(value)
  return font.family ? `'${font.family}', ${font.fallback}` : font.fallback
}

// Builds one Google Fonts stylesheet URL for the selected fonts, or null if none need loading.
export const googleFontsHref = (values: Array<string | null | undefined>) => {
  const families = [...new Set(values.map((v) => getThemeFont(v).family).filter(Boolean))]
  if (!families.length) return null
  const query = families
    .map((family) => `family=${family!.replace(/ /g, '+')}:wght@400;500;600;700`)
    .join('&')
  return `https://fonts.googleapis.com/css2?${query}&display=swap`
}
