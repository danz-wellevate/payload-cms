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
          blockType: 'careersHero',
          blockName: 'Banner',
          heading: 'Join the Team',
          description:
            'If you bring quality, drive, and genuine team spirit, you will fit right in at Wellevate.',
        },
        {
          blockType: 'jobListings',
          blockName: 'Open Positions',
        },
      ],
    },
  })

  payload.logger.info('Seeded starter homepage (Pages → Home)')
}
