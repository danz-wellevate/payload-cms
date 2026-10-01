import type { Block, Field } from 'payload'

import { linkFields } from '../fields/link'

const eyebrowField: Field = {
  name: 'eyebrow',
  type: 'text',
  admin: { description: 'Small label shown above the heading.' },
}

const backgroundField: Field = {
  name: 'background',
  type: 'select',
  defaultValue: 'default',
  options: [
    { label: 'Background color', value: 'default' },
    { label: 'Surface color', value: 'surface' },
  ],
  admin: { description: 'Section background, from General Settings → Theme.' },
}

const buttonFields: Field[] = [
  ...linkFields,
  {
    name: 'style',
    type: 'select',
    defaultValue: 'primary',
    options: [
      { label: 'Primary', value: 'primary' },
      { label: 'Outline', value: 'outline' },
    ],
  },
]

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    eyebrowField,
    { name: 'heading', type: 'text', required: true },
    { name: 'lead', type: 'textarea', label: 'Intro Paragraph' },
    {
      name: 'buttons',
      type: 'array',
      maxRows: 3,
      labels: { singular: 'Button', plural: 'Buttons' },
      fields: buttonFields,
    },
  ],
}

export const FeaturesBlock: Block = {
  slug: 'features',
  interfaceName: 'FeaturesBlock',
  labels: { singular: 'Features', plural: 'Features' },
  fields: [
    eyebrowField,
    { name: 'heading', type: 'text', required: true },
    { name: 'subheading', type: 'textarea', label: 'Sub Paragraph' },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Feature', plural: 'Features' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea' },
      ],
    },
    { ...backgroundField, defaultValue: 'surface' } as Field,
  ],
}

export const ContentStatsBlock: Block = {
  slug: 'contentStats',
  interfaceName: 'ContentStatsBlock',
  labels: { singular: 'Content + Stats', plural: 'Content + Stats' },
  fields: [
    eyebrowField,
    { name: 'heading', type: 'text', required: true },
    {
      name: 'body',
      type: 'textarea',
      label: 'Paragraph',
      admin: { description: 'Separate paragraphs with a blank line.' },
    },
    { name: 'note', type: 'textarea', label: 'Sub Paragraph' },
    {
      name: 'stats',
      type: 'array',
      labels: { singular: 'Stat', plural: 'Stats' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'value', type: 'text', required: true, admin: { placeholder: '99.9%' } },
            { name: 'label', type: 'text', required: true, admin: { placeholder: 'Uptime' } },
          ],
        },
      ],
    },
    backgroundField,
  ],
}

export const CallToActionBlock: Block = {
  slug: 'cta',
  interfaceName: 'CallToActionBlock',
  labels: { singular: 'Call to Action', plural: 'Calls to Action' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea', label: 'Paragraph' },
    {
      name: 'button',
      type: 'group',
      fields: linkFields.map((field) =>
        // Button is optional in the CTA, so relax the required label/url
        field.type === 'row'
          ? { ...field, fields: field.fields.map((f) => ({ ...f, required: false }) as Field) }
          : field,
      ),
    },
  ],
}

export const LatestPostsBlock: Block = {
  slug: 'latestPosts',
  interfaceName: 'LatestPostsBlock',
  labels: { singular: 'Latest Blog Posts', plural: 'Latest Blog Posts' },
  fields: [
    eyebrowField,
    { name: 'heading', type: 'text', required: true },
    { name: 'subheading', type: 'textarea', label: 'Sub Paragraph' },
    {
      name: 'limit',
      label: 'Number of posts',
      type: 'number',
      defaultValue: 3,
      min: 1,
      max: 12,
      required: true,
    },
    {
      name: 'showViewAll',
      label: 'Show "View all posts" link',
      type: 'checkbox',
      defaultValue: true,
    },
    backgroundField,
  ],
}

export const pageBlocks = [
  HeroBlock,
  FeaturesBlock,
  ContentStatsBlock,
  LatestPostsBlock,
  CallToActionBlock,
]
