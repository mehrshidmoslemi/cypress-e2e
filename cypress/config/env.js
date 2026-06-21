const path = require('path')
const dotenv = require('dotenv')

const envPath = path.resolve(__dirname, '..', '..', '.env')

dotenv.config({ path: envPath, override: true })

function normalizeAppPassword(value) {
  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\s+/g, '')
}

function getGmailCredentials() {
  const user = process.env.GMAIL_USER?.trim()
  const pass = process.env.GMAIL_APP_PASSWORD
    ? normalizeAppPassword(process.env.GMAIL_APP_PASSWORD)
    : ''

  if (!user || !pass) {
    throw new Error(
      `GMAIL_USER and GMAIL_APP_PASSWORD must be set in ${envPath}. Restart Cypress after editing .env.`,
    )
  }

  return { user, pass }
}

module.exports = {
  envPath,
  getGmailCredentials,
}
