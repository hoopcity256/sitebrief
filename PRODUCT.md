# PRODUCT.md — SiteBrief Product Definition

## Vision

SiteBrief gives solo contractors, remodelers, painters, roofers, landscapers, and small residential construction companies a way to turn jobsite photos and a short update into a professional, client-ready PDF in under 60 seconds.

## Core Promise

> "Professional job-site reports in under 60 seconds — from your browser."

## Target User

**Primary:** Solo residential contractor or small crew leader (1–5 people).
Characteristics:
- Works in the field all day, not at a desk.
- Wants to look professional to homeowners without spending hours on paperwork.
- Uses a smartphone web browser on the jobsite.

## Problems Solved

1. **Professionalism gap** — Contractors lose trust because their communication looks informal.
2. **Time cost** — Creating a formatted report by hand takes 20–40 minutes per job visit.
3. **Accountability** — No written record of what was agreed, found, or what's next.
4. **Payment delays** — Clients dispute charges without a photographic record.

## Core Workflow (Happy Path)

1. Open PWA app in mobile browser
2. Tap active project
3. Tap "New Update"
4. Select up to 10 photos via standard file input (camera or gallery)
5. Type or dictate update
6. Tap "Preview"
7. Tap "Generate PDF"
8. Tap "Share" (Web Share API) or download
Total time: ~60 seconds.

## Monetization

### SiteBrief Pro Subscription (Stripe)

| Plan    | Price   | Trial        |
|---------|---------|--------------|
| Monthly | $9.99   | 14 days free |
| Annual  | $79.99  | 14 days free |

- Trial begins via Stripe Checkout (payment method required).
- Managed via Stripe Customer Portal.
- After expiration: read existing reports and PDFs. Cannot create new reports.

### Free Tier Limitations (post-trial)

| Feature               | Expired Status | Active Status |
|-----------------------|----------------|---------------|
| View existing reports | ✅             | ✅            |
| Open existing PDFs    | ✅             | ✅            |
| Create new reports    | ❌ Locked      | ✅            |
| Generate new PDFs     | ❌ Locked      | ✅            |

## Report Contents

Every generated report includes:
1. Company logo + name + contact
2. Report number
3. Date and time generated
4. Project name, customer name, job address
5. Up to 10 photos with optional captions (2-column grid)
6. Work Completed, Problems, Next Steps sections

## Design Principles

1. **Mobile-First Browser** — Responsive for viewports 360px and up.
2. **Speed** — Client-side caching and optimization.
3. **Professional Output** — PDF looks perfect.
4. **Resilience** — Retain draft in IndexedDB if network drops.
