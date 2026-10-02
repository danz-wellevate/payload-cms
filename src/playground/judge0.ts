// Defaults to the free public Judge0 CE instance. Point JUDGE0_API_URL at a
// self-hosted instance or RapidAPI (https://judge0-ce.p.rapidapi.com) for production.
const API_URL = (process.env.JUDGE0_API_URL || 'https://ce.judge0.com').replace(/\/$/, '')
const API_KEY = process.env.JUDGE0_API_KEY

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
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: headers(), cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`Judge0 responded with ${response.status}: ${await response.text()}`)
  }
  return response.json()
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
  let submission = await request(`/submissions?base64_encoded=true&wait=true&fields=${FIELDS}`, {
    method: 'POST',
    body: JSON.stringify({
      language_id: languageId,
      source_code: encode(sourceCode),
      stdin: encode(stdin),
    }),
  })

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
