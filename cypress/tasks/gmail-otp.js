const { ImapFlow } = require('imapflow')
const { simpleParser } = require('mailparser')
const { getGmailCredentials } = require('../config/env')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function getGmailAuth() {
  return getGmailCredentials()
}

async function connectGmailClient(auth) {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth,
    logger: false,
  })

  try {
    await client.connect()
  } catch (error) {
    const message = error?.message || String(error)

    if (/auth|credentials|invalid|login/i.test(message)) {
      throw new Error(
        'Gmail login failed. Verify GMAIL_USER and GMAIL_APP_PASSWORD in .env (use a fresh App Password), then fully restart Cypress.',
      )
    }

    throw error
  }

  return client
}

async function parseRawMessage(rawMessage) {
  if (!rawMessage?.source) {
    return null
  }

  const parsed = await simpleParser(rawMessage.source)
  const recipients = [parsed.to?.text, parsed.cc?.text, parsed.bcc?.text]
    .filter(Boolean)
    .join(' ')

  return {
    uid: rawMessage.uid,
    subject: parsed.subject || '',
    recipients,
    body: parsed.text || parsed.html || '',
    date: parsed.date ? new Date(parsed.date) : null,
  }
}

async function fetchRecentMessages(client, limit = 40) {
  const status = await client.status('INBOX', { messages: true })
  const total = status.messages || 0
  if (!total) {
    return []
  }

  const start = Math.max(1, total - limit + 1)
  const messages = []

  for await (const message of client.fetch(`${start}:${total}`, {
    envelope: true,
    source: true,
    uid: true,
  })) {
    messages.push(message)
  }

  return messages.reverse()
}

function matchesEmail(message, toEmail) {
  const normalizedTarget = toEmail.toLowerCase()
  const plusTag = normalizedTarget.match(/\+([^@]+)/)?.[1]
  const haystack = `${message.recipients} ${message.body} ${message.subject}`.toLowerCase()

  if (haystack.includes(normalizedTarget)) {
    return true
  }

  if (plusTag && haystack.includes(plusTag)) {
    return true
  }

  return false
}

function extractOtp(body, otpRegex) {
  const regex = new RegExp(otpRegex, 'i')
  const match = body.match(regex)
  if (match) {
    return match[1] || match[0]
  }

  const lineMatch = body.match(/(?:^|\n)\s*(\d{4,8})\s*(?:\n|$)/m)
  if (lineMatch) {
    return lineMatch[1]
  }

  return null
}

async function pollGmailMessages({
  toEmail,
  subjectContains = '',
  afterDate = null,
  maxWaitMs = 90000,
  pollIntervalMs = 3000,
  onMatch,
}) {
  const auth = getGmailAuth()
  const deadline = Date.now() + maxWaitMs
  const minDate = afterDate ? new Date(new Date(afterDate).getTime() - 60_000) : null
  const client = await connectGmailClient(auth)

  try {
    while (Date.now() < deadline) {
      const lock = await client.getMailboxLock('INBOX')

      try {
        const rawMessages = await fetchRecentMessages(client)

        for (const rawMessage of rawMessages) {
          const message = await parseRawMessage(rawMessage)
          if (!message) {
            continue
          }

          if (minDate && message.date && message.date < minDate) {
            continue
          }

          if (!matchesEmail(message, toEmail)) {
            continue
          }

          if (
            subjectContains &&
            !message.subject.toLowerCase().includes(subjectContains.toLowerCase())
          ) {
            continue
          }

          const result = onMatch(message)
          if (result !== undefined && result !== null && result !== false) {
            await client.messageFlagsAdd(rawMessage.uid, ['\\Seen'], { uid: true })
            return result
          }
        }
      } finally {
        lock.release()
      }

      await sleep(pollIntervalMs)
    }

    return null
  } finally {
    await client.logout()
  }
}

async function getOtpFromGmail({
  toEmail,
  subjectContains = '',
  otpRegex = '\\b(\\d{4})\\b',
  maxWaitMs = 90000,
  pollIntervalMs = 3000,
  afterDate = null,
  excludeOtps = [],
}) {
  const excluded = new Set(excludeOtps.map(String))

  const otp = await pollGmailMessages({
    toEmail,
    subjectContains,
    afterDate,
    maxWaitMs,
    pollIntervalMs,
    onMatch: (message) => {
      const code = extractOtp(message.body, otpRegex)
      if (!code || excluded.has(code)) {
        return null
      }

      return code
    },
  })

  if (!otp) {
    throw new Error(`OTP email for ${toEmail} not found within ${maxWaitMs}ms`)
  }

  return otp
}

async function waitForEmailWithSubject({
  toEmail,
  subject,
  maxWaitMs = 90000,
  pollIntervalMs = 3000,
  afterDate = null,
}) {
  const normalizedSubject = subject.trim().toLowerCase()
  const found = await pollGmailMessages({
    toEmail,
    afterDate,
    maxWaitMs,
    pollIntervalMs,
    onMatch: (message) =>
      message.subject.trim().toLowerCase().includes(normalizedSubject) ? true : null,
  })

  if (!found) {
    throw new Error(
      `Email with subject "${subject}" for ${toEmail} not found within ${maxWaitMs}ms`,
    )
  }

  return true
}

module.exports = { getOtpFromGmail, waitForEmailWithSubject }
