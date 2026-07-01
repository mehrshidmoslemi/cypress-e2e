# Profile & Settings — Cypress Automation Brief (for Cursor)

> Use this document as prompt/context for Cursor to build a complete Cypress spec for the
> **Profile & Settings** area. It is written to match the existing conventions of this
> project (`cypress-e2e`). Please read and follow these sections before writing any code.

---

## 0) Context for Cursor (important — read this first)

This project is a Cypress suite for **AI HomeDesign Studio**.

- Cypress config: `cypress.config.js`
  - `baseUrl: https://app.aihomedesign.com`
  - `defaultCommandTimeout: 90000` (timeouts are generous because tests run live)
  - `video: true`, `screenshotOnRunFailure: true`
- Specs live in `cypress/e2e/**/*.cy.js`; shared helpers in `cypress/support/*-shared.js`.
- These are **live tests against production** (mocking is optional). Therefore:
  - Never actually upgrade/checkout a real account. Only go as far as **opening the modal /
    reaching Stripe**.
  - Use regex and fallback strategies in assertions (UI may shift slightly).

### Existing patterns you MUST reuse (don't copy — import)

- Session creation and login for different accounts:
  `cypress/support/pricing-page-shared.js` → `createPricingPageHelpers(prefix)`
  which exposes `ensureLoggedIn('free' | 'restricted' | 'active' | ...)` and `ACCOUNTS`.
- Dismissing blocking modals (cookie / onboarding "Which best describes you?"):
  `cypress/support/signup-shared.js` → `dismissBlockingModals()`
- Opening/closing the profile menu and logout: pattern already in `cypress/e2e/login.cy.js`
  (`profileMenuTrigger`, `openProfileMenu`, `logoutViaProfileMenu`).
- Subscription modal / Stripe assertions:
  `pricing-page-shared.js` → `assertSubscriptionModalOrStripe`, `assertStripePresent`,
  `clickCheckout`, `proceedToStripeIfNeeded`.

> **Core principle:** create a new file `cypress/support/profile-settings-shared.js` for
> shared logic and centralize selectors/helpers there, exactly like the other `*-shared.js`
> files. Create the spec file: `cypress/e2e/profile-settings.cy.js`.

---

## 1) Known selectors & notes (from the current codebase)

| Thing | Selector / approach |
|---|---|
| Profile menu trigger (avatar) | `nav [aria-haspopup="dialog"].rounded-full` → `.last().click({ force:true })` |
| Login span (logged-out state) | `cy.contains('span','Login')` |
| Login modal title | text `Welcome Back` |
| Logout | `cy.contains('Logout')` inside the profile menu |
| Nav links | Home `/`, Studio `/studio/projects`, Pricing `/pricing`, Help `/help` |
| Billing page | `/billing` |
| Pricing page | `/pricing` |
| Subscribe/Upgrade plan buttons (pricing) | `#v5-pricing-{monthly|yearly}-{pro|pro-plus|enterprise}-button` |
| Checkout button (subscription modal) | `cy.contains('button', /^Checkout$/i)` |
| Stripe | iframe whose `src/name/title` contains `stripe`, or text `card number / payment method` |
| Visible dialog | `cy.get('[role="dialog"]:visible').last()` |

> The exact selectors for the Profile Modal / Theme toggle / Brand Center must be discovered
> by Cursor via `cy.contains(...)` (text-based) or by probing the DOM, since there are no
> documented stable ids for them in the codebase. Preference: text-based + regex, not
> brittle XPath.

---

## 2) Test accounts

These accounts come from `ACCOUNTS` in `pricing-page-shared.js` (overridable via env):

| Type | env var | default |
|---|---|---|
| Free | `PRICING_FREE_EMAIL` | `memoslemi.sdstudio+1004@gmail.com` |
| Restricted | `PRICING_RESTRICTED_EMAIL` | `memoslemi.sdstudio+52@gmail.com` |
| Paid (Pro Plus monthly) | `PRICING_ACTIVE_*` | use `memoslemi.sdstudio+proplusmonthly@gmail.com` for this scenario |
| default password | — | `12345678` (restricted: `mmmmmmmm`) |

> If the `proplusmonthly@gmail.com` account is not in `ACCOUNTS`, add it as a new type
> (e.g. `paidProPlus`) to `ACCOUNTS` in `pricing-page-shared.js`, with fallback to env
> `PRICING_PROPLUS_MONTHLY_EMAIL` / `..._PASSWORD`. Also add the env keys to
> `cypress.config.js` (the `env` section) and `.env.example`.

### Expected behavior per account (per product owner)

- **Free**: in the Profile Modal there is an **Upgrade** button → click → a modal opens
  offering the **Pro Plus** plan for purchase → **Checkout** button → **Stripe** opens.
- **Restricted** (`+52`): behaves **exactly like Free** (same path upgrade → Pro Plus →
  checkout → Stripe).
- **Paid / Active (Pro Plus monthly)**:
  - shows the number of **photos** and **days** (remaining days).
  - has **two** **Upgrade** buttons that open a modal offering the **plan above the current
    one** (Pro Plus → **Enterprise**).
  - has an **Add Coins** button that, when clicked, allows buying extra coins.

---

## 3) Test cases

Each item is an `it(...)`. Write the titles in English (consistent with the rest of the
project). Group with `describe(...)`. The main path is provided by the product owner; items
marked **(added)** are extra coverage you should add.

### A) Profile Modal — Rendering & User Status

1. **Modal renders correctly** — after login, open the profile menu/avatar; verify the
   profile modal/panel renders (user name/email, avatar, and the main buttons are visible).
2. **User status: Free** — with the Free account, the status/plan is displayed correctly
   (Free-related text / "Upgrade" is visible).
3. **User status: Paid** — with the Pro Plus account, the active plan title + counters
   (photos, days) are visible.
4. **User status: Restricted** — with the `+52` account, the restricted status is displayed
   (like Free, the Upgrade button exists).
5. **(added) Profile modal closes correctly** — closes with ESC and with the Close button,
   and focus returns to the previous state.
6. **(added) Profile modal is consistent across pages** — open it from Home, Studio, and
   Pricing and confirm it shows the same information.

### B) Theme — Dark / Light

7. **Toggle switches Dark ↔ Light** — find the theme toggle (Dark/Light text/icon or a
   related `aria-label`), click it, and confirm the change. Verify via `<html>`/`<body>`:
   - presence/removal of a `dark` class or a `data-theme`/`color-scheme` attribute, or
   - change in the computed `background-color` of body (light → dark).
8. **Theme applies across all of Studio** — after switching to Dark, navigate to
   `/studio/projects` and another page (e.g. `/pricing`) and confirm the Dark theme is
   applied there too.
9. **(added) Theme persists after reload** — after `cy.reload()` the chosen theme remains
   (from localStorage/cookie).
10. **(added) Theme persists after re-login** — logout and login again; the chosen theme is
    preserved (if the product guarantees it; otherwise assert the actual behavior).

### C) Subscription Actions — Upgrade / Add Coins

11. **Free → Upgrade opens Pro Plus offer** — Free account, Profile Modal → **Upgrade** →
    a modal opens offering **Pro Plus**. Then **Checkout** → `assertStripePresent()`
    (go up to Stripe; do **not** complete payment).
12. **Restricted → Upgrade behaves like Free** — same path as item 11 with the `+52` account.
13. **Paid → two Upgrade buttons offer the next tier (Enterprise)** — Pro Plus account,
    find the two Upgrade buttons; each opens a modal offering **Enterprise** (the higher tier).
14. **Paid → Add Coins flow** — click the **Add Coins** button; a coin-purchase modal/page
    opens (coin amount options are visible). Go up to Stripe/Checkout but do not pay.
15. **(added) Upgrade/Checkout redirect to correct page/host** — confirm the modal or
    redirect reaches the right destination: pricing/checkout or the Stripe host
    (`accounts/checkout.stripe.com`). Use `cy.window().then(win => cy.spy(win,'open'))`
    if it opens in a new tab.
16. **(added) Close subscription modal without paying** — open the upgrade modal then close
    it with ESC/Close and confirm it returns to the previous state (no plan change occurs).
17. **(added) Free user cannot see "next tier = Enterprise"** — for Free, only Pro Plus
    should be offered, not Enterprise (distinguishing it from the Paid account).

### D) Profile Edit — Render / Edit / Save / Persist

18. **User info renders correctly** — the Profile Edit page/modal shows the user fields
    (name, email, and existing fields) with the current values.
19. **Editing is possible** — change an editable field (e.g. display name); the input
    accepts the new value and the Save button becomes enabled.
20. **Changes are saved correctly** — click Save; a success/toast message appears and the
    new value is immediately reflected in the UI. (To keep the test idempotent, revert the
    value to its previous state at the end — cleanup.)
21. **Changes persist after refresh** — `cy.reload()`; the new value remains.
22. **Changes persist after re-login** — logout and login again; the new value remains.
23. **(added) Validation on profile edit** — invalid value (e.g. empty name) → error
    message and Save is not possible.
24. **(added) Cancel discards edits** — make a change, click Cancel, confirm it was not saved.

### E) Brand Center

25. **Open Brand Center** — after login, enter Brand Center (from the profile menu or a
    direct path). Cursor should discover the exact selector via probing; search for the text
    "Brand Center".
26. **Fill and save brand info** — enter brand info (e.g. company/agent name, website, and
    if applicable a logo upload from `cypress/fixtures/images/`) and Save; a success message
    appears.
27. **(added) Brand info persists after reload/re-login** — like Profile Edit, confirm
    persistence. (Clean up at the end.)
28. **(added) Brand logo upload accepts a valid image** — if logo upload exists, upload a
    valid file (`cypress/fixtures/images/BC-test.jpg`) and confirm the preview.

---

## 4) Coding conventions Cursor must follow

- Language: **JavaScript (CommonJS `require`)**, not TypeScript (consistent with the rest).
- Structure:
  ```js
  // cypress/e2e/profile-settings.cy.js
  const profile = require('../support/profile-settings-shared')
  describe('Profile & Settings', () => {
    beforeEach(() => { cy.on('uncaught:exception', () => false) })
    describe('Profile Modal', () => { /* A */ })
    describe('Theme', () => { /* B */ })
    describe('Subscription Actions', () => { /* C */ })
    describe('Profile Edit', () => { /* D */ })
    describe('Brand Center', () => { /* E */ })
  })
  ```
- Always log in via `cy.session` (the `ensureLoggedIn` pattern) to keep it fast;
  **do not** log in manually in every test.
- Always after `cy.visit` → `dismissBlockingModals()` and dismiss onboarding if needed.
- Selectors: prefer **text + regex** and `[role="dialog"]:visible`; avoid brittle XPath and
  nth-child. Use any stable id (`#v5-...`) you find.
- Assertions resilient to UI fluctuation: use `.should(($el)=>{...})` and multiple fallbacks.
- **Never complete a real payment** — only go up to opening Stripe/checkout. Don't buy coins.
- Tests must be **idempotent**: any change in Profile Edit/Brand Center must be reverted to
  its previous state at the end of the same test.
- Long timeouts for network-bound elements: `{ timeout: 60000 }` like the other files.

---

## 5) Running

```bash
# all profile & settings scenarios
npx cypress run --spec "cypress/e2e/profile-settings.cy.js"

# open in interactive mode to debug and find selectors
npx cypress open
```

To find unknown selectors (Profile Modal / Theme toggle / Brand Center): first inspect the
DOM manually in `cypress open`, or write a temporary probe test that does
`cy.document().then(doc => cy.writeFile('cypress/fixtures/probe-profile.html', doc.body.innerHTML))`
— exactly like the existing `probe-*` files in `cypress/fixtures/`.

---

## 6) Expected output from Cursor

1. `cypress/support/profile-settings-shared.js` — selectors + helpers (reuse login from
   `pricing-page-shared`, openProfileModal, toggleTheme, assertTheme, openBrandCenter, ...).
2. `cypress/e2e/profile-settings.cy.js` — all the `it`s from section 3 implemented.
3. If needed: add the `paidProPlus` account to `ACCOUNTS` + env keys in `cypress.config.js`
   and `.env.example`.
4. All tests should pass, or be skipped/marked TODO with a clear reason (selector needs
   probing).
</content>
