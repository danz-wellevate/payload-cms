import type { Job } from '@/payload-types'

type LexicalNode = {
  type: string
  version: number
  text?: string
  children?: LexicalNode[]
  [k: string]: unknown
}

function nodeText(node: LexicalNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.children ?? []).map(nodeText).join('')
}

// Returns one plain-text qualification per list item or paragraph, for AI review.
export const qualificationsOf = (job: Pick<Job, 'qualifications'>) => {
  const content = job.qualifications as unknown as { root: { children: LexicalNode[] } } | null
  if (!content?.root?.children) return []
  return content.root.children
    .flatMap((node) => {
      if (node.type === 'list') return (node.children ?? []).map(nodeText)
      return [nodeText(node)]
    })
    .filter(Boolean)
}
