const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { ImapFlow } = require('imapflow')
const { simpleParser } = require('mailparser')

async function main() {
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
  const lock = await client.getMailboxLock('INBOX')

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const uids = await client.search({ since }, { uid: true })
    console.log('Messages in last 24h:', uids.length)

    for (const uid of uids.slice(-20)) {
      const raw = await client.fetchOne(uid, { uid: true, source: true, envelope: true })
      if (!raw?.source) continue

      const parsed = await simpleParser(raw.source)
      const to = parsed.to?.text || JSON.stringify(parsed.to?.value || [])
      const from = parsed.from?.text || ''
      const subject = parsed.subject || '(no subject)'
      const date = parsed.date?.toISOString() || 'unknown'
      const body = (parsed.text || '').replace(/\s+/g, ' ').slice(0, 120)

      console.log(`\n[${date}]`)
      console.log('From:', from)
      console.log('To:', to)
      console.log('Subject:', subject)
      if (/memoslemi|sdstudio|signup|verify|otp|code|aihome/i.test(from + to + subject + body)) {
        console.log('Body:', body)
        const nums = body.match(/\d{4,8}/g)
        if (nums) console.log('Numbers:', nums)
      }
    }
  } finally {
    lock.release()
    await client.logout()
  }
}

main().catch(console.error)
