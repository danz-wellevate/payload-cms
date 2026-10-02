import type { Payload } from 'payload'

import { toLexical } from './posts'

// Fills in placeholder instructions the first time, so the panel isn't empty.
// Skipped once the global has been saved, so editors can clear it freely.
export const seedPlayground = async (payload: Payload) => {
  const playground = await payload.findGlobal({ slug: 'playground' })
  if (playground.updatedAt) return

  await payload.updateGlobal({
    slug: 'playground',
    data: {
      heading: 'Instructions',
      instructions: toLexical([
        'Replace this text in Admin → Settings → Code Playground with the task you want people to solve.',
        '## How it works',
        '- Choose a language from the dropdown above the editor.',
        '- Your program reads from standard input and prints to standard output.',
        '- Type any input your program needs in the Input box.',
        '- Press Run code (or Ctrl + Enter) to execute it.',
      ]),
    },
  })

  payload.logger.info('Seeded Code Playground instructions (Settings → Code Playground)')
}
