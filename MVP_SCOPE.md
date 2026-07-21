# MVP_SCOPE.md — SiteBrief MVP Boundary

**Submission target: July 28, 2026**

This document is the authoritative list of what is and is not in scope for the initial launch. Every agent must treat this as a hard boundary.

---

## IN SCOPE

### Frontend (PWA)
- React + Vite + TypeScript (strict mode)
- Mobile-first responsive design (360 px and up)
- PWA manifest and service-worker shell caching (no offline sync)
- React Router

### Authentication & Backend
- Supabase Auth (Email/Password & Magic Link)
- Supabase Postgres for relational data
- Supabase Storage for photos
- Row Level Security (RLS) on all user-owned records

### Projects & Reports
- Create, list, archive projects
- Create reports (up to 10 photos)
- Text fields: Work Completed, Problems, Next Steps
- IndexedDB draft recovery for active editor session

### Photo Pipeline
- Mobile browser file input (`<input type="file" accept="image/*">`)
- Client-side compression (long-edge target: 1200px, size <= 200 KB)
- Supabase Storage upload with RLS

### PDF Generation & Sharing
- Client-side PDF with `@react-pdf/renderer` (Blob output)
- Web Share API when `navigator.canShare` is true
- Fallback to standard download

### Monetization (Stripe)
- Stripe Checkout + Stripe Billing + Stripe Customer Portal
- Monthly ($9.99) & Annual ($79.99) with 14-day trials
- Supabase Edge Functions for Stripe integration

### Hosting
- Cloudflare Pages

---

## OUT OF SCOPE — DO NOT IMPLEMENT

- Native iOS or Android apps (Expo, React Native)
- App Store or Google Play deployment
- Bidirectional offline sync engine
- SQLite / local device databases for primary persistence
- Team or multi-user accounts
- Custom backend server (Node/Express, etc.)
- In-app customer messaging
- Analytics or crash reporting services
- AI-generated descriptions
- Weather integration
- Multiple report templates

---

## ASSUMPTIONS

1. Application requires connectivity for auth, data, and billing.
2. Draft recovery uses IndexedDB purely as a temporary safety net, not a full offline mode.
3. Web Share API is the primary distribution method on mobile.
4. Supabase is the sole backend provider.
5. Stripe handles all billing state and logic.
