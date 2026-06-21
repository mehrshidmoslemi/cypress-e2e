const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { ImapFlow } = require('imapflow')
const { simpleParser } = require('mailparser')

const OTP_PATTERNS = [
  /\b(\d{6})\b/g,
  /\b(\d{4})\b/g,
  /\b(\d{8})\b/g,
  /code[:\s]*(\d+)/gi,
  /otp[:\s]*(\d+)/gi,
  /verification[:\s]*(\d+)/gi,
]

async function inspectMailbox(mailbox) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER?.trim(),
      pass: process.env.GMAIL_APP_PASSWORD?.trim(),
    },
    logger: false,
  })

  await client.connect()
  const lock = await client.getMailboxLock(mailbox)

  try {
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const uids = await client.search({ since }, { uid: true })
    console.log(`\n=== ${mailbox}: ${uids.length} messages (last 6h) ===`)

    for (const uid of uids.slice(-15)) {
      const raw = await client.fetchOne(uid, { uid: true, source: true })
      if (!raw?.source) continue

      const parsed = await simpleParser(raw.source)
      const to = parsed.to?.text || ''
      const subject = parsed.subject || '(no subject)'
      const body = (parsed.text || parsed.html || '').slice(0, 500)
      const date = parsed.date?.toISOString() || 'unknown'

      const isRelevant =
        /signup|verify|verification|otp|code|aihome|home.?design/i.test(subject + body) ||
        /\+signup/i.test(to)

      if (!isRelevant) continue

      console.log('\n---')
      console.log('Date:', date)
      console.log('Subject:', subject)
      console.log('To:', to)
      console.log('Body preview:', body.replace(/\s+/g, ' ').slice(0, 200))

      for (const pattern of OTP_PATTERNS) {
        const matches = [...body.matchAll(pattern)]
        if (matches.length) {
          console.log('OTP candidates:', matches.map((m) => m[1] || m[0]).slice(0, 5))
        }
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }
}

async function main() {
  for (const box of ['INBOX', '[Gmail]/All Mail', '[Gmail]/Spam']) {
    try {
      await inspectMailbox(box)
    } catch (err) {
      console.log(`\n=== ${box}: skipped (${err.message}) ===`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
