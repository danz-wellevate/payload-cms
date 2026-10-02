import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Applicants } from './collections/Applicants'
import { Assessments } from './collections/Assessments'
import { ProctoringEvents } from './collections/ProctoringEvents'
import { ProctoringRecordings } from './collections/ProctoringRecordings'
import { ProctoringSnapshots } from './collections/ProctoringSnapshots'
import { SiteSettings } from './globals/SiteSettings'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'
import { Playground } from './globals/Playground'
import { smtpConfigured } from './email/smtp'
import { scheduleCaptureCleanup } from './assessment/captures'
import { seedHomePage } from './seed/home'
import { seedPlayground } from './seed/playground'
import { seedPosts } from './seed/posts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      // Coding exam stats and review queue above the collections (shadcn/ui).
      beforeDashboard: ['/components/admin/dashboard/ExamOverview#ExamOverview'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Pages,
    Posts,
    Users,
    Media,
    Applicants,
    Assessments,
    ProctoringEvents,
    ProctoringRecordings,
    ProctoringSnapshots,
  ],
  globals: [SiteSettings, Header, Footer, Playground],
  editor: lexicalEditor(),
  // Sends applicant set-password emails (e.g. via Gmail SMTP, see .env.example).
  // Until host, user and password are all set, Payload prints emails to the console instead.
  email: smtpConfigured()
    ? nodemailerAdapter({
        defaultFromAddress:
          process.env.SMTP_FROM_ADDRESS || process.env.SMTP_USER || 'no-reply@example.com',
        defaultFromName: process.env.SMTP_FROM_NAME || 'Coding Exam',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        },
      })
    : undefined,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL || 'file:./payload-cms.db',
    },
  }),
  sharp,
  onInit: async (payload) => {
    await seedHomePage(payload)
    await seedPosts(payload)
    await seedPlayground(payload)
    // Deletes webcam recordings/snapshots after the retention period (default 30 days).
    scheduleCaptureCleanup(payload)
  },
  plugins: [],
})
