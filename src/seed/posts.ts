import type { Payload } from 'payload'

import type { Post } from '@/payload-types'

// Minimal Lexical builder for seed content.
// Lines: "## Heading", "> Quote", "- list item" (consecutive items form one list), anything else is a paragraph.
const base = { version: 1, direction: 'ltr' as const, format: '' as const, indent: 0 }
const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  detail: 0,
  mode: 'normal',
  style: '',
  version: 1,
})

export const toLexical = (lines: string[]): Post['content'] => {
  const children: Record<string, unknown>[] = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      children.push({ ...base, type: 'heading', tag: 'h2', children: [text(line.slice(3))] })
    } else if (line.startsWith('> ')) {
      children.push({ ...base, type: 'quote', children: [text(line.slice(2))] })
    } else if (line.startsWith('- ')) {
      const item = { ...base, type: 'listitem', value: 1, children: [text(line.slice(2))] }
      const last = children.at(-1)
      if (last?.type === 'list') {
        const items = last.children as Record<string, unknown>[]
        items.push({ ...item, value: items.length + 1 })
      } else {
        children.push({ ...base, type: 'list', listType: 'bullet', tag: 'ul', start: 1, children: [item] })
      }
    } else {
      children.push({ ...base, type: 'paragraph', textFormat: 0, textStyle: '', children: [text(line)] })
    }
  }

  return { root: { ...base, type: 'root', children } } as Post['content']
}

const posts: Array<Omit<Post, 'id' | 'content' | 'createdAt' | 'updatedAt'> & { body: string[] }> = [
  {
    title: 'Five principles for a website that converts',
    slug: 'five-principles-for-a-website-that-converts',
    category: 'Strategy',
    authorName: 'Alex Rivera',
    publishedAt: '2026-09-24T09:00:00.000Z',
    excerpt:
      'Great websites are not about clever tricks. They are about clarity, speed and trust. Here are five principles we come back to on every project.',
    body: [
      'Every project starts with the same question: what should a visitor do next? The best websites answer that question on every screen, without making people think.',
      '## 1. Lead with the outcome',
      'Visitors care about what they get, not how you do it. Put the result front and center in your hero, and save the process for further down the page.',
      '## 2. One primary action per section',
      'When everything is a button, nothing is. Pick the single most important action for each section and give it your primary color.',
      '## 3. Earn trust early',
      'Testimonials, recognisable logos and concrete numbers do more than any adjective. Show proof before you ask for commitment.',
      '## 4. Make it fast',
      'Every extra second of load time costs attention. Optimise images, keep scripts lean and render on the server where you can.',
      '## 5. Keep iterating',
      'A website is never finished. Ship, measure and refine — small improvements compound quickly.',
    ],
  },
  {
    title: 'Choosing fonts that fit your brand',
    slug: 'choosing-fonts-that-fit-your-brand',
    category: 'Design',
    authorName: 'Jamie Chen',
    publishedAt: '2026-09-15T09:00:00.000Z',
    excerpt:
      'Typography sets the tone before anyone reads a word. A practical guide to pairing heading and paragraph fonts.',
    body: [
      'Fonts carry personality. A geometric sans feels modern and confident, while a classic serif signals heritage and editorial depth. The trick is choosing a pair that works together.',
      '## Start with contrast',
      'Pair a distinctive heading font with a calm, highly legible paragraph font. Contrast in style creates hierarchy; too much similarity makes everything blur together.',
      '## Pairings we like',
      '- Poppins headings with Inter paragraphs — clean and contemporary',
      '- Playfair Display headings with Source Serif 4 — classic and editorial',
      '- Space Grotesk headings with DM Sans — technical but friendly',
      '- Montserrat headings with Lora — bold headlines, warm reading text',
      '## Test with real content',
      'Lorem ipsum hides problems. Try your pairing with real headlines and long paragraphs, on both mobile and desktop, before you commit.',
      '> Good typography is invisible. Bad typography is everywhere.',
    ],
  },
  {
    title: 'Building a color palette in an afternoon',
    slug: 'building-a-color-palette-in-an-afternoon',
    category: 'Design',
    authorName: 'Jamie Chen',
    publishedAt: '2026-09-02T09:00:00.000Z',
    excerpt:
      'You do not need a dozen colors. A primary, a background, a surface and three text shades will take you surprisingly far.',
    body: [
      'Many brand palettes fail because they try to do too much. For a website, a small, purposeful palette is easier to apply consistently and easier to maintain.',
      '## The essentials',
      '- Primary: your brand color, reserved for actions and accents',
      '- Background: the canvas most content sits on',
      '- Surface: a subtle alternate for cards and sections',
      '- Heading, paragraph and sub paragraph text colors for hierarchy',
      '## Check your contrast',
      'Text needs enough contrast against its background to stay readable for everyone. Aim for a contrast ratio of at least 4.5:1 for body text.',
      'Once your palette is set, apply it everywhere through theme settings rather than hard-coding colors — future changes become a two-minute job.',
    ],
  },
  {
    title: 'Why we moved our site to a headless CMS',
    slug: 'why-we-moved-to-a-headless-cms',
    category: 'Engineering',
    authorName: 'Sam Patel',
    publishedAt: '2026-08-20T09:00:00.000Z',
    excerpt:
      'Separating content from presentation gave our team faster pages, happier editors and a lot more freedom on the frontend.',
    body: [
      'Our old site mixed content, templates and plugins in one monolith. Every change risked breaking something else, and page speed suffered.',
      '## What changed',
      'With a headless CMS, editors manage structured content in a clean admin panel while developers build the frontend with modern tools. Each side can move at its own pace.',
      '## The benefits',
      '- Pages are rendered on the server and load quickly',
      '- Editors build pages from reusable sections instead of wrestling with layouts',
      '- Content is available through an API for future apps and channels',
      '- Fewer plugins means fewer security updates to chase',
      '## Would we do it again?',
      'Absolutely. The initial setup takes some planning, but the day-to-day experience is better for everyone involved.',
    ],
  },
  {
    title: 'Writing headlines people actually read',
    slug: 'writing-headlines-people-actually-read',
    category: 'Content',
    authorName: 'Alex Rivera',
    publishedAt: '2026-08-06T09:00:00.000Z',
    excerpt:
      'Most visitors skim. Your headlines have a few seconds to earn attention — here is how to make them count.',
    body: [
      'People scan pages in a pattern: headline, subheading, maybe a button. If those few words do not land, the rest of your content never gets read.',
      '## Be specific',
      '"Better software" says nothing. "Ship features twice as fast" gives the reader something concrete to want.',
      '## Write for the reader',
      'Use the words your customers use, not your internal jargon. If you have to explain the headline, rewrite it.',
      '## Keep it short',
      'Aim for under ten words. Use the sub paragraph below the headline to add detail and context.',
      '> If you can only change one thing on a page, change the headline.',
    ],
  },
  {
    title: 'A simple checklist before you launch',
    slug: 'a-simple-checklist-before-you-launch',
    category: 'Strategy',
    authorName: 'Sam Patel',
    publishedAt: '2026-07-22T09:00:00.000Z',
    excerpt:
      'Launch day nerves are normal. Run through this checklist and you will catch the issues that matter most.',
    body: [
      'A launch is the moment real people meet your work. A little preparation goes a long way toward making it smooth.',
      '## Content',
      '- Every page has a clear title and description',
      '- Links work and point to the right places',
      '- Images have alt text',
      '## Design',
      '- Check every page on a phone, a tablet and a desktop',
      '- Make sure fonts and colors match your theme settings',
      '## Technical',
      '- Set up a favicon and site name in General Settings',
      '- Test forms and confirm submissions arrive',
      '- Run a performance check and fix anything slow',
      'Once you are live, keep an eye on analytics for the first week. Real visitors will show you what to improve next.',
    ],
  },
]

// Creates sample blog posts on first boot, and adds a Latest Posts section to the homepage.
export const seedPosts = async (payload: Payload) => {
  const { totalDocs } = await payload.count({ collection: 'posts' })
  if (totalDocs > 0) return

  for (const { body, ...post } of posts) {
    await payload.create({ collection: 'posts', data: { ...post, content: toLexical(body) } })
  }

  const {
    docs: [home],
  } = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } }, limit: 1 })

  if (home && !home.layout?.some((block) => block.blockType === 'latestPosts')) {
    const layout = [...(home.layout ?? [])]
    const ctaIndex = layout.findIndex((block) => block.blockType === 'cta')
    layout.splice(ctaIndex === -1 ? layout.length : ctaIndex, 0, {
      blockType: 'latestPosts',
      blockName: 'Blog',
      eyebrow: 'Blog',
      heading: 'Latest articles',
      subheading: 'Ideas and practical guides on design, content and building for the web.',
      limit: 3,
      showViewAll: true,
      background: 'surface',
    })
    await payload.update({ collection: 'pages', id: home.id, data: { layout } })
  }

  payload.logger.info(`Seeded ${posts.length} blog posts`)
}
