// Migrates job postings from the old SQLite database (payload-cms.db) to PostgreSQL.
// Run inside Docker where both the SQLite file and PostgreSQL are accessible:
//   docker-compose run --rm app npm run migrate:sqlite

import Database from 'better-sqlite3'
import config from '@payload-config'
import { getPayload } from 'payload'

type SqliteJob = {
  id: number
  title: string
  slug: string
  status: string
  location: string | null
  employment_type: string | null
  summary: string | null
  qualifications: string | null
  minimum_score: number
}

type SqliteSkill = {
  _order: number
  _parent_id: number
  skill: string
}

// Converts plain-text qualifications (one per line) to a Lexical bulleted list.
function toRichText(text: string | null) {
  const lines = (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      children: [
        {
          type: 'list',
          listType: 'bullet',
          version: 1,
          start: 1,
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          children: lines.map((line, i) => ({
            type: 'listitem',
            version: 1,
            value: i + 1,
            direction: 'ltr' as const,
            format: '' as const,
            indent: 0,
            children: [{ type: 'text', version: 1, text: line, format: 0, mode: 'normal', style: '', detail: 0 }],
          })),
        },
      ],
    },
  }
}

const db = new Database('payload-cms.db', { readonly: true })
const payload = await getPayload({ config })

const jobs = db.prepare('SELECT * FROM jobs').all() as SqliteJob[]
const allSkills = db
  .prepare('SELECT * FROM jobs_required_skills ORDER BY _parent_id, _order')
  .all() as SqliteSkill[]

console.log(`Found ${jobs.length} job(s) in SQLite.`)

for (const job of jobs) {
  const skills = allSkills
    .filter((s) => s._parent_id === job.id)
    .map((s) => ({ skill: s.skill }))

  // Skip if already exists in PostgreSQL (by slug).
  const existing = await payload.find({
    collection: 'jobs',
    where: { slug: { equals: job.slug } },
    limit: 1,
  })
  if (existing.totalDocs > 0) {
    console.log(`  Skipping "${job.title}" — already exists.`)
    continue
  }

  await payload.create({
    collection: 'jobs',
    data: {
      title: job.title,
      slug: job.slug,
      status: job.status as 'open' | 'closed',
      location: job.location ?? undefined,
      employmentType: job.employment_type ?? undefined,
      summary: job.summary ?? undefined,
      qualifications: toRichText(job.qualifications),
      requiredSkills: skills,
      minimumScore: job.minimum_score,
    },
  })
  console.log(`  Created "${job.title}" with ${skills.length} skill(s).`)
}

console.log('Done.')
process.exit(0)
