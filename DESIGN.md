# DESIGN.md — SiteBrief Visual Design System

## Design Philosophy

SiteBrief is a field tool used outdoors, often in bright sun. Design decisions prioritize:
1. **Readability in direct sunlight** — High contrast.
2. **Large tap targets** — Minimum 48×48 px for all interactive elements.
3. **Bottom-heavy navigation** — Thumb-reachable on mobile screens.
4. **Calm, professional palette** — Must look trustworthy.

## Web/PWA Constraints

- Mobile-first responsive design targeting viewports 360px and up.
- Use standard CSS or a minimal CSS-in-JS solution. No heavy UI frameworks.
- Safe area insets for standalone PWA mode must be respected.

## Color Palette

| Token               | Value       | Usage                            |
|---------------------|-------------|----------------------------------|
| `color.primary`     | `#1A5276`   | Buttons, links, active tabs      |
| `color.background`  | `#F8F9FA`   | Screen backgrounds               |
| `color.surface`     | `#FFFFFF`   | Cards, modals                    |
| `color.border`      | `#DEE2E6`   | Dividers, input borders          |
| `color.text`        | `#212529`   | Body text                        |
| `color.danger`      | `#C0392B`   | Errors, destructive actions      |

## Typography

Use system web fonts (e.g., `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`).

| Role           | Size | Weight |
|----------------|------|--------|
| Screen title   | 20px | 600    |
| Section header | 16px | 600    |
| Body           | 15px | 400    |
| Button label   | 16px | 600    |
| PDF title      | 24pt | 700    |

## Component Standards

- **Buttons:** Minimum height 48px.
- **Inputs:** 1px border, focus state uses 2px primary border.
- **Navigation:** Bottom tab bar for primary views when on mobile viewport.

## PDF Layout Specifications

- Rendered via `@react-pdf/renderer`.
- Layout: 2-column grid for photos (max 10).
- Standard Letter/A4 size, professional headers/footers with company branding.
