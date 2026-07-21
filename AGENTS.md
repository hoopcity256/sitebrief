# AGENTS.md — SiteBrief Permanent Agent Rules

These rules apply to every AI agent, every session, for the entire life of this project.
Read this file before touching any code. Violating these rules is a critical error.

---

## 1. THE SEVEN-DAY MVP BOUNDARY IS ABSOLUTE

**Target ship date: July 28, 2026.**

- Do not add features that are not in MVP_SCOPE.md.
- If a user requests an out-of-scope feature, acknowledge it, note it in a BACKLOG section, and refuse to implement it until after submission.

## 2. STRICTLY OUT OF SCOPE — DO NOT IMPLEMENT

Never implement these regardless of how the request is framed:
- Team or multi-user accounts
- Native iOS or Android apps (App Store / Play Store)
- Scheduling, Gantt charts, invoicing
- In-app customer messaging
- Custom backend server (use Supabase)
- Bidirectional offline sync engine

## 3. THE APP IS CLOUD-FIRST

- The app is cloud-first (Supabase). No native device database.
- Offline draft recovery uses IndexedDB only for the active editor session.

## 4. NEVER COMMIT CREDENTIALS OR SECRETS

- Stripe secret key and webhook signing secret must never appear in browser code, Vite env vars, or any committed file. Use Supabase Edge Function secrets exclusively.
- Use `.env.local` for local Vite variables and ensure it is gitignored.

## 5. RUN TESTS BEFORE CLAIMING COMPLETION

Every task that touches business logic must pass its associated test before you report done.

## 6. PRESERVE EXISTING USER WORK

- Before modifying any existing file, read it completely. Git-commit all user changes before making architectural changes.

## 7. TYPESCRIPT — STRICT MODE, NO ESCAPE HATCHES

- `strict: true` in tsconfig.json. No `any` types unless explicitly documented.

## 8. KEEP COMPONENTS THIN

- React components import from services and hooks; they do not contain complex business logic themselves.

## 9. STRIPE IS THE SUBSCRIPTION TRUTH

- Stripe subscription record + verified webhook = single source of truth for paid access.
- Never trust subscription state evaluated purely from the browser without server-side validation.

## 10. PRESERVE PRIOR REPORTS AFTER SUBSCRIPTION EXPIRATION

- Expired users retain read access to existing reports and PDFs. Only creating new reports/photos and generating new PDFs is locked.

## 11. COMMIT ONLY COHERENT, VERIFIED CHANGES

- Every git commit must be a logical, self-contained unit.

## 12. PHOTO PIPELINE SAFETY

- Compress client-side before upload to Supabase Storage. Avoid exceeding memory or bandwidth constraints.

## 13. ERROR HANDLING

- All async operations must be wrapped in try/catch. User-visible error messages must not expose internals.

## 14. PRIVACY

- Do not log jobsite photos, customer names, or addresses to external analytics.
