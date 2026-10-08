import type { Job } from '@/payload-types'

// The job's qualifications, one per line, without list markers ("- ", "1. ", "• ").
export const qualificationsOf = (job: Pick<Job, 'qualifications'>) =>
  job.qualifications
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, '').trim())
    .filter(Boolean)
