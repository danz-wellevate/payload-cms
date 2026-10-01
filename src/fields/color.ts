import type { TextField } from 'payload'

const HEX = /^#[0-9a-f]{6}$/i

export const colorField = (
  name: string,
  label: string,
  defaultValue: string,
  description?: string,
): TextField => ({
  name,
  label,
  type: 'text',
  defaultValue,
  validate: (value: string | null | undefined) =>
    !value || HEX.test(value) || 'Use a 6-digit hex color, e.g. #1a2b3c',
  admin: {
    description,
    components: {
      Field: '/components/ColorPickerField#ColorPickerField',
    },
  },
})
