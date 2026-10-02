import type { GlobalConfig } from 'payload'

import { isAdmin } from '../access/isAdmin'
import { colorField } from '../fields/color'
import { themeDefaults, themeFonts } from '../theme/fonts'

const fontOptions = themeFonts.map(({ label, value }) => ({ label, value }))

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'General Settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'General',
          fields: [
            {
              name: 'siteName',
              type: 'text',
              required: true,
            },
            {
              name: 'tagline',
              type: 'text',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                },
                {
                  name: 'favicon',
                  type: 'upload',
                  relationTo: 'media',
                },
              ],
            },
          ],
        },
        {
          name: 'theme',
          label: 'Theme',
          fields: [
            {
              type: 'collapsible',
              label: 'Typography',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'headingFont',
                      label: 'Heading Font',
                      type: 'select',
                      options: fontOptions,
                      defaultValue: themeDefaults.headingFont,
                      admin: { description: 'Used for h1–h6.' },
                    },
                    {
                      name: 'bodyFont',
                      label: 'Paragraph Font',
                      type: 'select',
                      options: fontOptions,
                      defaultValue: themeDefaults.bodyFont,
                      admin: { description: 'Used for paragraphs, sub paragraphs and UI text.' },
                    },
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Text Colors',
              fields: [
                {
                  type: 'row',
                  fields: [
                    colorField('headingColor', 'Heading Color', themeDefaults.headingColor),
                    colorField('paragraphColor', 'Paragraph Color', themeDefaults.paragraphColor),
                    colorField(
                      'subParagraphColor',
                      'Sub Paragraph Color',
                      themeDefaults.subParagraphColor,
                      'Taglines, captions and secondary text.',
                    ),
                  ],
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Brand Colors',
              fields: [
                {
                  type: 'row',
                  fields: [
                    colorField(
                      'primaryColor',
                      'Primary Color',
                      themeDefaults.primaryColor,
                      'Buttons, links and accents.',
                    ),
                    colorField('backgroundColor', 'Background Color', themeDefaults.backgroundColor),
                    colorField(
                      'surfaceColor',
                      'Surface Color',
                      themeDefaults.surfaceColor,
                      'Cards and alternate sections.',
                    ),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
