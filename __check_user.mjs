import { getPayload } from 'payload'
import config from './src/payload.config.ts'

const payload = await getPayload({ config: await config })
const { docs } = await payload.find({
  collection: 'users',
  limit: 50,
  depth: 0,
  overrideAccess: true,
  showHiddenFields: true,
})
for (const u of docs) {
  console.log(JSON.stringify({
    email: u.email,
    loginAttempts: u.loginAttempts,
    lockUntil: u.lockUntil,
    role: u.role,
  }))
}
process.exit(0)
