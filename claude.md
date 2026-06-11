# StudyAI — Design System & Rules

## Palette — Glass Mint

- Accent: #38E0C3 (mint) — used in 4 places only: logo, active nav, token card, primary CTA
- Backgrounds: #0a1628 (base), #111d30 (raised), rgba(255,255,255,0.04) (cards)
- Text: #fff (primary), rgba(255,255,255,0.75) (secondary), rgba(255,255,255,0.28) (muted)
- Borders: 0.5px solid rgba(255,255,255,0.09) default, rgba(56,224,195,0.22) for mint-tinted cards
- NO other colors anywhere. No purple, blue, red, orange.

## Glass Effect

- Cards: background rgba(255,255,255,0.04) + backdrop-filter blur(16px) + border rgba(255,255,255,0.09)
- Sidebar: background rgba(255,255,255,0.04) + backdrop-filter blur(20px)
- Bottom nav (mobile): background rgba(10,22,40,0.85) + backdrop-filter blur(20px)
- Background: 3 soft radial orbs (mint + blue at low opacity) behind everything
- Shine line: 0.5px gradient line at top of shell, rgba(56,224,195,0.4) → white → transparent

## Typography

- Font: Inter (body), Space Grotesk (headings)
- Weights: 400 body, 500 headings/labels only. Never 600 or 700.
- Sizes: 26-27px page greeting, 14px nav labels, 13px card titles, 11-12px meta/timestamps
- Letter spacing: -0.025em on large headings, 0.06em on uppercase section labels

## Layout rules

- Desktop: 208px fixed sidebar + flex-1 main content, padding 26px 30px
- Mobile: no sidebar, bottom nav 5 tabs (Home, Notebooks, +New FAB, Library, Profile)
- Notebooks: 3-col grid desktop → horizontal scroll strip on mobile
- All borders: 0.5px only. Never 1px or 2px.
- Border radius: 8px small elements, 10-12px cards, 14px mobile cards

## Interactions

- Hover: border-color shift only (to rgba(56,224,195,0.2) on notebook cards) — no scale, no shadow, no translate
- Transitions: all 150ms ease on everything
- Active nav: background rgba(56,224,195,0.08), border 0.5px rgba(56,224,195,0.2), text #38E0C3

## Component patterns

- Section headers: 11px uppercase letter-spacing 0.06em label LEFT + mint link RIGHT
- Activity badges: all same neutral style — no different colors per output type
- Token card: mint-tinted bg, number in #38E0C3, progress bar fill #38E0C3
- Empty states: centered icon (mint, low opacity) + short label + primary action pill
- No gradients. No box-shadows. No glow. Flat surfaces with glass blur only.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS (class-based dark mode)
- Framer Motion (page transitions: fade opacity 0→1, 0.2s, no slide)
- Zustand (state)
- Supabase (auth + db + storage + edge functions)
- React Router v7 (client-side only)
- Lucide React (icons)

## Background Orbs — REQUIRED on every page, do not skip

Three absolutely positioned radial orbs sit behind all content
on every single page. They are non-interactive and pointer-events none.
They create the "light bleeding through glass" effect.

Implementation (add to the root layout wrapper, not individual pages):

```css
/* Orb 1 — mint, top-left, largest */
position: absolute;
width: 500px;
height: 500px;
border-radius: 50%;
background: rgba(56, 224, 195, 0.12);
top: -150px;
left: -100px;
pointer-events: none;
z-index: 0;
filter: blur(1px);

/* Orb 2 — blue, bottom-right */
position: absolute;
width: 380px;
height: 380px;
border-radius: 50%;
background: rgba(99, 179, 255, 0.08);
bottom: -80px;
right: -60px;
pointer-events: none;
z-index: 0;

/* Orb 3 — mint, center-ish, smallest, subtle */
position: absolute;
width: 260px;
height: 260px;
border-radius: 50%;
background: rgba(56, 224, 195, 0.05);
top: 45%;
right: 28%;
pointer-events: none;
z-index: 0;
```

The root layout container must have:

- position: relative
- overflow: hidden
- All page content sits at z-index: 1 or higher so orbs stay behind

Also add the shine line to the very top of the app shell:

- height: 1px
- background: linear-gradient(90deg, transparent, rgba(56,224,195,0.4),
  rgba(255,255,255,0.25), transparent)
- position: absolute, top: 0, left: 0, right: 0
- z-index: 10, pointer-events: none

## Responsiveness — Rules for every page

### Breakpoints (use these exact Tailwind values, no custom ones)

- Mobile: < 768px (sm and below)
- Tablet: 768–1023px (md)
- Desktop: 1024px+ (lg and above)

### Layout shifts per breakpoint

DESKTOP (lg+):

- Sidebar visible, 208px fixed width, never collapses
- Main content: flex-1, padding 26px 30px
- Background orbs at full size (500px, 380px, 260px)
- Notebook grid: 3 columns (grid-cols-3)
- Shine line visible

TABLET (md):

- Sidebar collapses to icon-only, 64px wide
  (show only icons, hide text labels)
- Main content: padding 20px 24px
- Notebook grid: 2 columns (grid-cols-2)
- Orbs scale down by ~30%
- Token card: stack vertically (flex-col)

MOBILE (below md):

- Sidebar completely hidden (hidden md:flex)
- Bottom nav appears (fixed bottom, 80px tall,
  backdrop-blur glass style)
- Main content: padding 16px 18px
- Notebook cards: horizontal scroll strip,
  NOT a grid (overflow-x-auto, flex-nowrap)
- Each notebook card min-width: 150px
- Token card: compact, number + button top row,
  bar + label below
- Greeting: font-size drops to 24px
- Quick action pills: wrap to 2 rows max
- Orb 1: width/height 280px, top -80px, left -60px
- Orb 2: width/height 200px, bottom -40px, right -30px
- Orb 3: hidden on mobile (too subtle at small size)
- Shine line: still visible, full width

### Bottom nav (mobile only)

5 tabs in this exact order:

1. Home — ti-layout-dashboard
2. Notebooks — ti-notebook
3. New (FAB) — center, raised glass button,
   mint border, ti-plus icon
4. Library — ti-library
5. Profile — ti-user

Active tab: background rgba(56,224,195,0.08),
border 0.5px rgba(56,224,195,0.2),
icon + label #38E0C3
Inactive: icon + label rgba(255,255,255,0.28)
Safe area: add padding-bottom env(safe-area-inset-bottom)
so it clears iPhone home bar

### Typography scaling

- Page greeting: text-2xl md:text-3xl (24px → 28px)
- Section labels: always 11px, no scaling
- Card titles: always 12.5px, no scaling
- Nav labels: 10px mobile, 12.5px desktop

### Touch targets (mobile)

- Every tappable element minimum 44×44px
- Nav tabs: flex-1, full height of bottom nav
- Cards: entire card is tappable, no small hit areas
- Icon buttons in topbar: 40×40px on mobile

### Scrolling behavior

- Main content area: overflow-y auto,
  -webkit-overflow-scrolling touch
- Horizontal notebook strip: overflow-x auto,
  scrollbar-width none (hidden scrollbar)
  padding-right 20px so last card isn't flush to edge
- Never nest scrollable areas inside each other

### Things that must NEVER happen on mobile

- Sidebar must never overlap content (use hidden, not opacity-0)
- Text must never overflow its container (always truncate with
  text-ellipsis + overflow-hidden + whitespace-nowrap on titles)
- Orbs must never cause horizontal scroll
  (root layout must have overflow-x: hidden)
- Bottom nav must never sit on top of page content without
  the page having enough bottom padding (always pb-28 on
  mobile page content so last item clears the nav)
- No horizontal scroll on the page itself,
  only inside designated scroll containers

### PWA specific (iOS Safari)

- Use viewport-fit=cover in index.html meta tag
- Bottom nav respects safe area:
  padding-bottom: env(safe-area-inset-bottom)
- Status bar color matches #0a1628 via theme-color meta tag
- No fixed elements except bottom nav and shine line

## Games

- Chess uses `chess.js` (logic) + `react-chessboard` (UI); installed with `--legacy-peer-deps`
- Chess board colors: dark squares `#1a3a4a`, light squares `#2d5a6e` (deep teal, premium feel)
- Scrabble is custom-built — no library; 15×15 board, standard English tile distribution
- Scrabble dictionary: `enable1.txt` fetched once from GitHub raw, cached in `sessionStorage` as a `Set` (O(1) lookups)
- Scrabble tile color: `rgba(251,191,36,0.9)` amber/cream — intentional exception to mint-only accent rule
- Both games save to Supabase (`chess_games`, `scrabble_games`) on every move/word
- AI review costs 20 tokens; calls `proxy-groq` edge function with `jsonMode: true`; review stored in `ai_review` column
- `useStreak` calls the `record_activity` Supabase RPC on every study/game action; atomic streak logic is in SQL
- Streak badge uses orange `#F97316` — the ONE exception to mint-only accent (fire is orange)
- Active games show on the Dashboard homepage; streak count appears in the greeting and summary line
- Break Room nav: `id="tour-break-room"`, uses `Coffee` icon from `@/lib/icons`
