# AI HomeDesign Flow Agent

This CLI helps run AI HomeDesign Cypress flows faster by flow code, flow group, and QA scenario ID from the test scenarios document.

## Supported Flows (auto-discovered)

The agent reads `cypress/e2e/*-flow-test*.cy.js` and discovers flow codes such as:

- `BC`, `CC`, `WC`, `UC`, `IE`, `FC`, `FR`, `ID`, `VS`, `IR`, `D2D`

## Commands

```bash
npm run flow-agent:list
npm run flow-agent:scenarios
npm run flow-agent:run
npm run flow-agent:run-scenario -- --scenario 9,10
npm run flow-chat
npm run flow-agent:smoke
npm run flow-agent:all
```

Direct usage:

```bash
node tools/flow-agent.js list
node tools/flow-agent.js scenarios
node tools/flow-agent.js run --flows IE,UC
node tools/flow-agent.js run --group smoke
node tools/flow-agent.js run-scenario --scenario 9
node tools/flow-agent.js run-scenario --scenario 9,21 --headed --browser chrome
node tools/flow-chat-agent.js
node tools/flow-chat-agent.js "برو سرویس virtual staging و جنریت کن"
node tools/flow-agent.js run --flows VS --raw
node tools/flow-agent.js run --flows D2D --headed --browser chrome
```

## Chat Mode (Natural Language)

Start chat mode:

```bash
npm run flow-chat
```

You can also run one-shot commands:

```bash
node tools/flow-chat-agent.js "run scenario 9"
node tools/flow-chat-agent.js "run virtual staging headed chrome"
```

Examples of chat prompts:

- `برو سرویس virtual staging و جنریت کن`
- `run virtual staging upload "cypress/fixtures/images/vs-test-room.jpg" style hampton living room generate`
- `run virtual staging generate download normal`
- `run virtual staging generate download both feedback bookmark`
- `run item removal upload "cypress/fixtures/images/IR-test.jpg" generate download both feedback`
- `run image enhancement upload "cypress/fixtures/images/IE-indoor-test.jpg" outdoor generate download normal`
- `run under construction upload "cypress/fixtures/images/UC-test.jpg" living room style hampton generate download normal`
- `run day to dusk upload "cypress/fixtures/images/D2D-test.png" sunset generate download normal`
- `سناریو 9 رو اجرا کن`
- `run scenario 9 and scenario 21 headed`
- `لیست فلوها`
- `لیست سناریوها`
- `status`
- `last`
- `dry run on`
- `dry run run virtual staging style modern living room generate`
- `run virtual staging ... retry 2`
- `ai on` / `ai off`

Current limitation:

- Fine-grained step-by-step chat execution is currently implemented for:
  - `VS` via `chat-vs-dynamic.cy.js`
  - `IR` via `chat-ir-dynamic.cy.js`
  - `IE` via `chat-ie-dynamic.cy.js`
  - `UC` via `chat-uc-dynamic.cy.js`
  - `D2D` via `chat-d2d-dynamic.cy.js`
- Other services still map to existing predefined Cypress flows.

## Reliability Tips

- Prefer `dry run` before expensive commands to inspect intent mapping.
- Use one-shot mode for CI-style reproducibility.
- For long runs, start with `scenario 9` only when you need full coverage; otherwise use targeted service commands.
- Use `retry N` (up to 5) in the same prompt for transient failures.
- Each execution writes a JSON report to `.chat-agent-reports`.

## AI Intent Parsing

- Create `cypress-e2e/.env` from `.env.example` and set `OPENAI_API_KEY` (this file is gitignored).
- The chat agent auto-loads `.env` on startup.
- If `OPENAI_API_KEY` is set, the chat agent uses an LLM to extract intent from free-form conversation (Persian/English), then executes the mapped action.
- If LLM parsing fails or key is not configured, it automatically falls back to rule-based parsing.
- Optional model override: `CHAT_AGENT_AI_MODEL` (default: `gpt-4o-mini`).

## Flow Groups

- `smoke`: `VS`, `IR`, `IE`, `D2D`
- `renovation`: `BC`, `CC`, `WC`, `FC`, `FR`, `UC`, `ID`
- `edit`: `VS`, `IR`, `IE`, `D2D`
- `all`: all discovered flows

## Notes

- By default, the agent uses `*-optimized.cy.js` specs when available.
- Use `--raw` to run non-optimized specs.
- If a specific optimized/raw file does not exist for a flow, the agent falls back to the available file.
- `run-scenario` maps doc scenario IDs to available Cypress flows.
- Some doc scenarios are currently marked `manual` because they do not yet have Cypress spec mapping (for example: authentication OTP edge cases, pricing, and credit/account behavior).


