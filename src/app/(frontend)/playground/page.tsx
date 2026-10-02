import { redirect } from 'next/navigation'

import { getCurrentApplicant, loginUrl } from '@/applicant/server'

// The IDE is only available inside the proctored exam, so this old open page now sends
// applicants to their exam (or to sign in first).
export default async function PlaygroundPage() {
  const applicant = await getCurrentApplicant()
  redirect(applicant ? '/applicant/exam' : loginUrl('/applicant/exam'))
}
