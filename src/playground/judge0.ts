// Replace src/playground/judge0.ts with this file, and add examShim.ts next to it.
//
// What's new: when a candidate's JavaScript / TypeScript / Python / Go code mentions the exam
// API host, runCode() adds a built-in stand-in for that API (see examShim.ts). The data comes
// live from the real API, fetched by YOUR server, so Judge0 needs no network access.
//
// Optional: JUDGE0_ENABLE_NETWORK=true still sends `enable_network: true` (only useful on a
// self-hosted Judge0 with ALLOW_ENABLE_NETWORK=true). Leave it unset otherwise.

import { applyExamShim, EXAM_KEY, EXAM_URL, needsExamShim } from './examShim'

// Defaults to the free public Judge0 CE instance. Point JUDGE0_API_URL at a
// self-hosted instance or RapidAPI (https://judge0-ce.p.rapidapi.com) for production.
const API_URL = (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/$/, '')
const API_KEY = process.env.JUDGE0_API_KEY
const ENABLE_NETWORK = process.env.JUDGE0_ENABLE_NETWORK === 'true'

// Judge0 compiles TypeScript with tsc's old default target (ES5), which rejects async/await,
// Promise, startsWith, Map and so on. Ask for a modern target instead.
const TYPESCRIPT_ID = 101
const TYPESCRIPT_OPTIONS = '--target ES2020'

const headers = (): HeadersInit => {
  const result: Record<string, string> = { 'Content-Type': 'application/json' }
  if (!API_KEY) return result

  const host = new URL(API_URL).host
  if (host.endsWith('rapidapi.com')) {
    result['X-RapidAPI-Key'] = API_KEY
    result['X-RapidAPI-Host'] = host
  } else {
    result['X-Auth-Token'] = API_KEY
  }
  return result
}

const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64')
const decode = (value?: string | null) =>
  value ? Buffer.from(value, 'base64').toString('utf8') : ''

type Judge0Response = {
  token: string
  status: { id: number; description: string }
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  time: string | null
  memory: number | null
}

export type RunResult = {
  status: { id: number; description: string }
  stdout: string
  stderr: string
  compileOutput: string
  message: string
  time: string | null
  memory: number | null
}

// Judge0 status ids: 1 = In Queue, 2 = Processing.
const isPending = (statusId: number) => statusId === 1 || statusId === 2

const FIELDS = 'token,status,stdout,stderr,compile_output,message,time,memory'
const POLL_INTERVAL_MS = 750
const MAX_POLLS = 20

const request = async (path: string, init?: RequestInit): Promise<Judge0Response> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: headers(),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Judge0 responded with ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

// ---- Live copy of the exam API's response (fetched by this server, cached briefly) ----------

const EXAM_CACHE_MS = 10 * 60_000
let examCache: { at: number; body: string } | null = null

const getExamBody = async (): Promise<string | null> => {
  if (examCache && Date.now() - examCache.at < EXAM_CACHE_MS) return examCache.body
  try {
    const response = await fetch(EXAM_URL, {
      headers: { 'x-api-key': EXAM_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const body = await response.text()
    JSON.parse(body) // only keep a valid JSON response
    examCache = { at: Date.now(), body }
    return body
  } catch (error) {
    console.warn('Could not load the exam API response for the fetch stand-in:', error)
    // A slightly old copy is better than none.
    return examCache?.body ?? null
  }
}

export const runCode = async ({
  languageId,
  sourceCode,
  stdin = '',
}: {
  languageId: number
  sourceCode: string
  stdin?: string
}): Promise<RunResult> => {
  let codeToRun = sourceCode
  if (needsExamShim(languageId, sourceCode)) {
    const body = await getExamBody()
    if (body) codeToRun = applyExamShim(languageId, sourceCode, body)
  }

  const submit = (withCompilerOptions: boolean) =>
    request(`/submissions?base64_encoded=true&wait=true&fields=${FIELDS}`, {
      method: 'POST',
      body: JSON.stringify({
        language_id: languageId,
        source_code: encode(codeToRun),
        stdin: encode(stdin),
        ...(withCompilerOptions ? { compiler_options: TYPESCRIPT_OPTIONS } : {}),
        ...(ENABLE_NETWORK ? { enable_network: true } : {}),
      }),
    })

  let submission: Judge0Response
  try {
    submission = await submit(languageId === TYPESCRIPT_ID)
  } catch (error) {
    // Some Judge0 setups refuse compiler options (HTTP 422). Run without them rather than fail.
    if (languageId === TYPESCRIPT_ID && String(error).includes('422')) {
      submission = await submit(false)
    } else {
      throw error
    }
  }

  // Some instances ignore `wait=true` under load, so fall back to polling the token.
  for (let i = 0; isPending(submission.status.id) && i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    submission = await request(
      `/submissions/${submission.token}?base64_encoded=true&fields=${FIELDS}`,
    )
  }

  return {
    status: submission.status,
    stdout: decode(submission.stdout),
    stderr: decode(submission.stderr),
    compileOutput: decode(submission.compile_output),
    message: decode(submission.message),
    time: submission.time,
    memory: submission.memory,
  }
}
