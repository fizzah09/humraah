# Humraah: AI Banking Companion (Build4Better 2026)

Urdu-first web app (PWA) that helps people in Pakistan use their banking apps and understand their money.
**Not a bank, not affiliated with any bank, never moves money, never asks for PIN / password / OTP.**

**Team:** _Name 1 (role), Name 2 (role), Name 3, Name 4_ · **University:** _…_ · **Final submitted commit:** _add commit ID_
**Demo video (≤ 2 min):** _link_ · **Pitch deck:** _link_ · **Live link (optional):** _link_

## Target user & problem
Older adults, first-time smartphone users, shopkeepers and homemakers who find banking apps intimidating,
can't read statements, forget why cash was withdrawn, and are targeted by scam SMS.

## How it teaches (not just does)
Every feature follows one learning path: **1. Mashq → 2. Saathi ke saath → 3. Khud.**
1. **Mashq (practice):** a fake bank app ("Mashq Bank") where the user practises sending money, checking balance and
   handling "session expired", with no real money. Wrong taps never punish: they explain what that button does.
   After 2 misses the right button glows. A fake "bank officer" call asks for the OTP mid-lesson to rehearse the #1 scam.
   Confidence is rated 😟→😄 before and after each lesson (PRD success metric).
2. **Saathi ke saath:** on the real app, the assistant gives one step at a time plus a **"Kyun?"** (why) line, so the
   user learns the pattern instead of memorising taps. The user always taps themselves.
3. **Khud:** every finished task ends with a 3-line "yaad rakhein" recap and a link back to practice.

## Features
| # | Feature | What works |
|---|---------|-----------|
| 0 | **Mashq (practice simulator)** | 3 lessons + "asli ya naqli?" scam quiz, forgiving errors, hint after 2 misses, confidence before/after, Urdu coach with read-aloud. |
| F1 | **Screenshot-guided Assistant** (floating button on every screen) | Text, voice (Web Speech API) and **image upload**. Detects bank + task (Urdu / Roman Urdu / English), reads the screenshot with on-device OCR, gives ONE instruction in Urdu, **highlights the button** on the screenshot from OCR coordinates, money-step checkpoints, recovery ("galat tap", "main kho gaya"), 3-line recap, refuses PIN/OTP. Uses **Google Gemini** (vision, server-side) when `GEMINI_API_KEY` is set, otherwise the deterministic playbook engine. Always answers in Urdu (+ Roman Urdu), reads replies aloud, and asks a question back whenever the screenshot or message is unclear. |
| F2 | **Statement Analyzer** | CSV / pasted text / **statement photo (OCR)**. Integrity check (opening + credits − debits = closing), suspect rows highlighted, categories (user corrections remembered), fee glossary with Urdu explanations + source + last-verified date, anomalies, grounded Q&A, account numbers masked to last 4. |
| F3 | **Spending Ledger + reconciliation** | 10-second quick add (chips), voice entry ("paanch hazaar ghar ka rashan"), debit-SMS paste, edit/delete. Matcher: exact amount, ±2 days, compatible type, one-to-one, closest date, ties flagged, ATM fee attached. Headline "Rs. X withdrawn, Rs. Y explained (Z%)", 2-tap "what was this for?", manual override, print/PDF report. |
| F4 | **Scam Checker** | Paste text or **upload screenshot (OCR)**. Rule engine (OTP/PIN asks, urgency, prize/BISP bait, short & lookalike links, pay-to-personal, AnyDesk, call-a-mobile, sender mismatch). Red flags highlighted inside the message. Never says "safe". One-tap "warn my family" share. |
| F5 | **Zakat Calculator** | Cash, bank (prefill from statement), gold by karat, silver, stock, receivables, investments, liabilities. Silver/gold nisab choice with explanation, tola/gram toggle, price source + timestamp, printable breakdown, scholar-difference notice. |
| F7 | **Sauda ka hisaab** | Grocery list by typing, voice or parchi photo (AI vision if key, else on-device OCR). Asks about unreadable lines, missing quantity or rate; remembers rates; shows each line's working, step-by-step addition, change back by notes; adds to Kharcha diary. |
| F9 | **Fitra + Fidya** | Household fitra with CII 2026 per-person rates (source + year shown), working and plain explanation, fidya per missed fast. |
| F8 | **Mera bank** | Bank choice, verified helplines (tap to call), official domains, "asli ya naqli?" check for numbers/emails/websites, task guides, banking words glossary. |
| F6 | **Bills & Deadlines** | Add by **bill photo (OCR extraction, user confirms)** or manually. Due soon / overdue / paid, recurring bills auto-create next month, reminders at 7 days / 2 days / due date via browser notifications + `.ics` calendar export, family followers, bill-spike insight, "mark as paid" → Ledger. |

### Image upload (used across the app)
`src/components/ImageUpload.tsx`: gallery, **camera capture**, drag & drop, paste (Ctrl+V); consent notice before first upload;
resize to 1280px; **one-tap blur tool** (drag boxes over name/balance); **auto-blur numbers** (OCR finds 6+ digit strings);
images are never stored. OCR (Tesseract.js) runs fully in the browser from self-hosted files.

## Login, privacy & transparency
- **Tasveer Code login:** the user picks 4 of 9 pictures (not digits, so nobody re-uses their bank PIN). The code derives an
  AES-256-GCM key with PBKDF2-SHA256 (600,000 iterations, random salt). All personal data on the device is encrypted with it;
  the key exists only in memory. Auto-lock after 5 minutes idle and on reload; lockout after 5 wrong tries (30 s, doubling, max 15 min).
- **After login** the app asks which bank app the user uses (HBL, UBL, MCB, Meezan, NBP, ABL) and tailors help.
- **Meri history:** every question, every Saathi reply, every piece of information shared and every image (metadata only:
  size, blur, OCR, sent to AI or not, deleted at) is logged in plain Roman Urdu. Downloadable and deletable.
- **Images are never stored:** Saathi screenshots disappear after 2 minutes, all other images immediately.
- Security headers (CSP, HSTS, frame-ancestors none, nosniff, strict Permissions-Policy), same-origin + size checks and rate
  limits on API routes, zod validation of every AI response, prompt-injection rules for image/OCR text.
- **Google login (Firebase Auth)** when Firebase is configured: the user signs in with Google, then sets/enters the Tasveer Code.
  Encrypted data is backed up to **Cloud Firestore** (ciphertext only; the code never leaves the phone), so a new phone with the
  same Google account + code gets everything back. API routes verify the Firebase ID token, so only signed-in users spend your Gemini quota.
- Honest limits: a 4-picture code (repeats allowed) has 6,561 combinations. The lockout protects the app
  screen, but someone who has both the Google account and the encrypted data could brute-force the code offline. For production add passkeys.

## Bank information (sources)
Official helplines, caller IDs, domains and emails in `src/lib/banks/directory.ts` were read from each bank's own website on
31 Oct 2026 (URL stored per bank and shown in the app). Unconfirmed items (some app names, SMS sender IDs, masked emails) are
labelled as unverified in the app. Banks don't publish button-by-button app guides, so the step guides list common label
variants and the assistant quotes only the label it actually reads on the user's screenshot.

## Accessibility & design decisions
Urdu (Nastaliq) / Roman Urdu toggle on every screen · **"AA" big-text toggle** · 18px minimum text · 48px+ touch targets ·
5-item bottom bar on mobile with plain labels (Ghar, Saathi, Mashq, Fraud check, Bill yaad) · voice input and read-aloud ·
one main action per screen · plain words instead of jargon ("Kharcha diary", "Hisaab poora mil gaya") · high-contrast green theme
(`src/theme/colors.ts`).

## Target user
See [`docs/USER_RESEARCH.md`](docs/USER_RESEARCH.md). **Replace the example persona with your real interviews** (a parent or
grandparent you actually observed): judges score evidence, not assumptions.

## Setup & run
```bash
npm install                  # also copies the OCR worker + English data into public/ (postinstall)
cp .env.example .env.local   # then fill in YOUR keys (steps below). Without keys the app runs in demo mode.
npm run dev                  # http://localhost:3000
npm test                     # 49 unit tests
npm run build && npm start
```
Requires Node 18+. **Never commit `.env.local`** (it is in `.gitignore`). No real key is written anywhere in the code.

### Which database? Cloud Firestore (recommended)
| Option | Why / why not |
|---|---|
| **Cloud Firestore** ✅ | Same Firebase project as login; per-user security rules (`firestore.rules`: each user reads/writes only `users/{their uid}`); offline cache on the phone; free Spark tier is enough for a hackathon; no server to run. |
| Realtime Database | Also works with Firebase Auth, but rules and querying are weaker for per-user documents; no advantage here. |
| Supabase / Postgres | Good, but a second vendor and a second login system next to Firebase Auth. |

Stored layout (all values are AES-256-GCM ciphertext made on the phone):
`users/{uid}` → `{ salt, iterations, verifier, updatedAt }` (checks the Tasveer Code, not the code itself) ·
`users/{uid}/vault/{ledger|bills|activity|…}` → `{ ct, updatedAt }`.

### 1. Gemini key (AI + Urdu voice)
1. Open <https://aistudio.google.com/apikey> → **Create API key** (in a Google Cloud project you own).
2. Put it in `.env.local` as `GEMINI_API_KEY=...`. It is read only on the server (`src/lib/ai/gemini.ts` has `import 'server-only'`), so it never reaches the browser.
3. Optional: `GEMINI_MODEL`, `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE` to choose models and voice (see <https://ai.google.dev/gemini-api/docs/speech-generation>).
4. In AI Studio, set a **spending cap / quota** for the project so a bug can't run up a bill.

### 2. Firebase login + Firestore
1. <https://console.firebase.google.com> → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick a support email).
3. **Authentication → Settings → Authorized domains**: add your live domain (e.g. `your-app.vercel.app`). `localhost` is already there.
4. **Build → Firestore Database → Create database → Production mode**, region close to Pakistan (e.g. `asia-south1`, Mumbai).
5. **Firestore → Rules**: paste the contents of `firestore.rules` → **Publish** (or `npx firebase-tools deploy --only firestore:rules`).
6. **Project settings (⚙) → General → Your apps → Web (</>)** → register app → copy `apiKey`, `authDomain`, `projectId`, `appId`
   into `NEXT_PUBLIC_FIREBASE_*` in `.env.local`. These four are public identifiers (Google says so); security comes from the rules.
7. Optional hardening: in Google Cloud Console → APIs & Services → Credentials, restrict the browser API key to your domain(s), and turn on **App Check**.
8. Restart `npm run dev`. The first screen is now "Google se login".

### 3. Deploy (Vercel)
Import the repo → **Settings → Environment Variables**: add every key from `.env.example` with your values → Deploy →
add the Vercel domain to Firebase **Authorized domains** (step 2.3).

### What was and wasn't tested
Unit tests and TypeScript checks pass. **Not tested live:** Gemini speech generation and Firebase login, because they require your keys.
After adding keys, test: Google login → create code → add a kharcha → log in on a second browser → data appears; Saathi with a screenshot;
"Sunein" button plays server-generated speech. If speech generation fails, the browser falls back to its available Urdu or Roman Urdu voice.

## Tech stack
Next.js 14 (App Router, TypeScript), Tailwind CSS (theme in `src/theme/colors.ts`), zod (strict AI output schema),
Tesseract.js (OCR), Recharts, Web Speech API, Vitest, **Google Gemini** (AI + TTS, REST from the server), **Firebase Auth + Cloud Firestore**
(SDK lazy-loaded so the first page stays ~110 KB), jose (Firebase token check). `/settings` lets the user export, delete (phone + cloud) or log out.

## AI tools & their role
- **Google Gemini (server-side only, `src/lib/ai/gemini.ts`, used by `/api/assistant`, `/api/parchi`, `/api/tts`)**: perceives the screenshot
  / parchi and writes the Urdu instruction; JSON schema enforced, and when unsure it sets `needs_clarification` and asks the user. Reads replies aloud in Urdu. Output validated with zod, one retry on malformed JSON, falls back to the playbook engine.
  Screenshot/OCR text is treated as untrusted data (prompt-injection defence).
- Everything else (matching, maths, scam rules, parsing, validation) is deterministic code with unit tests.

## Known limitations / mocked
- Meezan playbooks in `src/lib/assistant/playbooks.ts` are **illustrative (UNVERIFIED)**: walk the real app and update labels.
- Fee glossary and official sender IDs are **not yet verified** against bank sources.
- Gold/silver prices are manual (no live price API wired yet; add one in `src/lib/zakat/calc.ts`).
- WhatsApp/email reminders need a server + Twilio sandbox (not included); demo uses browser notifications + .ics.
- No PDF statement parsing yet (CSV / text / photo supported). Cloud backup needs your Firebase project (see setup).
- Scam rule accuracy has only been checked on the unit-test examples; evaluate on a ~40 message labelled set and report here.

## Full PRD
[`docs/Bank_Saathi_PRD_v2.pdf`](docs/Bank_Saathi_PRD_v2.pdf) / `.docx` / `PRD.md`: original PRD merged with every feature added during the build.

## Demo script
See [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) (2 minutes).

## Credits
Tesseract.js (Apache-2.0), Recharts (MIT), zod (MIT), Next.js (MIT), Google Fonts: Inter, Noto Nastaliq Urdu (OFL), @tesseract.js-data/eng (Apache-2.0).
AI assistance: _state which AI coding tools your team used and for what (required by the rules)._
