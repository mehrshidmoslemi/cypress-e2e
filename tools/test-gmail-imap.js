const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { ImapFlow } = require('imapflow')

async function main() {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    logger: false,
  })

  await client.connect()
  const lock = await client.getMailboxLock('INBOX')

  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const uids = await client.search({ since }, { uid: true })
    console.log('Recent messages (24h):', uids.length)

    for (const uid of uids.slice(-5)) {
      const msg = await client.fetchOne(uid, { uid: true, envelope: true })
      console.log('-', msg.envelope?.subject, '| to:', msg.envelope?.to?.map((t) => t.address).join(', '))
    }
  } finally {
    lock.release()
    await client.logout()
  }
}

main().catch((err) => {
  console.error('IMAP test failed:', err.message)
  process.exit(1)
})
