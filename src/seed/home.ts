import type { Payload } from 'payload'

import type { CallToActionBlock } from '@/payload-types'

// Homepage section that sends applicants to the coding exam portal.
export const playgroundSection: CallToActionBlock = {
  blockType: 'cta',
  blockName: 'Code Playground',
  heading: 'Test your programming knowledge',
  body: 'Sign in to the applicant portal and solve the coding exercise in Python, JavaScript, Java, C++ and more — right in your browser.',
  button: { label: 'Take the coding exam', url: '/applicant/login', newTab: false },
}

// Creates the starter homepage on first boot so there is something to edit in Admin → Pages.
export const seedHomePage = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
  })
  if (totalDocs > 0) return

  await payload.create({
    collection: 'pages',
    data: {
      title: 'Home',
      slug: 'home',
      layout: [
        {
          blockType: 'hero',
          eyebrow: 'Welcome',
          heading: 'Build something people love.',
          lead: 'A clean, flexible starting point for your website. Every heading, paragraph and button on this page follows the theme you set in General Settings.',
          buttons: [
            { label: 'Get started', url: '#features', newTab: false, style: 'primary' },
            { label: 'Go to admin panel', url: '/admin', newTab: false, style: 'outline' },
          ],
        },
        {
          blockType: 'features',
          blockName: 'Features',
          eyebrow: 'Features',
          heading: 'Everything you need to launch',
          subheading: 'Sub paragraph text uses the sub paragraph color for hierarchy.',
          background: 'surface',
          items: [
            {
              title: 'Fast by default',
              body: 'Server-rendered pages with Next.js and a headless CMS that stays out of your way.',
            },
            {
              title: 'Editable everywhere',
              body: 'Sections, menus, footer, fonts and colors are all managed from the admin panel — no deploy needed.',
            },
            {
              title: 'Built to grow',
              body: 'Add, remove and reorder sections as your content needs evolve.',
            },
          ],
        },
        playgroundSection,
        {
          blockType: 'contentStats',
          eyebrow: 'About',
          heading: 'Designed around your brand',
          body: 'Choose your heading and paragraph fonts, then fine-tune heading, paragraph and sub paragraph colors. The primary color drives buttons, links and accents across the site.',
          note: 'Button text automatically switches between light and dark to stay readable on your primary color.',
          background: 'default',
          stats: [
            { value: '99.9%', label: 'Uptime' },
            { value: '< 1s', label: 'Page loads' },
            { value: '24/7', label: 'Support' },
          ],
        },
        {
          blockType: 'cta',
          heading: 'Ready to get started?',
          body: 'Head to the admin panel to make this site your own.',
          button: { label: 'Open admin', url: '/admin', newTab: false },
        },
      ],
    },
  })

  payload.logger.info('Seeded starter homepage (Pages → Home)')
}
