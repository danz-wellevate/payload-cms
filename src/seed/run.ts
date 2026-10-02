import config from '@payload-config'
import { getPayload } from 'payload'

import { seedHomePage } from './home'
import { seedPlayground } from './playground'
import { seedPosts } from './posts'

// `npm run seed` — creates the starter homepage and blog posts if they don't exist yet.
const payload = await getPayload({ config })
await seedHomePage(payload)
await seedPosts(payload)
await seedPlayground(payload)
process.exit(0)
