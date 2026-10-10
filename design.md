# Visual Design System & Aesthetic Directives

## 1. Aesthetic Philosophy: Dark Editorial Luxury

The Quad Computing visual interface is built upon a **Dark Luxury & Old-Money Hospitality** design language. Rather than presenting a utilitarian, cluttered POS interface or a generic SaaS dashboard, the visual experience evokes the tactile, calm, and prestigious atmosphere of a bespoke mountain retreat, private member's lounge, or high-end boutique hotel.

### Core Visual Tenets
- **Deep Obsidian Foundations**: Interfaces utilize rich, layered blacks and slate grays rather than washed-out grays or harsh pure blacks.
- **Warm Amber & Muted Gold Radiance**: Accents mimic warm candlelight, aged brass, and high-altitude fireside warmth.
- **Editorial Typography**: Typographic hierarchies prioritize razor-sharp clarity, ample tracking for uppercase badges, and deliberate weight contrasts.
- **Micro-Delight & Tactile Weight**: Subtle borders, soft radial ambient glows, and fluid spring animations convey a physical sense of craftsmanship.

---

## 2. Master Color Palette & Design Tokens

### 2.1 Backgrounds & Surfaces
```css
/* Deepest ground for app root & modal backdrops */
--bg-void: #09090b;

/* Primary workspace & container surface */
--bg-surface-dark: #121215;

/* Elevated cards, dropdown panels, and floating drawers */
--bg-card: #18181b;

/* Hover states and active selections */
--bg-card-hover: #222227;

/* Subtle hairline borders and dividers */
--border-subtle: #27272a;
--border-highlight: #3f3f46;
```

### 2.2 Brand Accents & Status Indicators
```css
/* Primary luxury brand gold / amber */
--accent-amber-500: #f59e0b;
--accent-amber-600: #d97706;
--accent-amber-glow: rgba(245, 158, 11, 0.15);

/* Success, cashback earnings & settled states */
--status-success: #10b981;
--status-success-bg: rgba(16, 185, 129, 0.12);

/* Warning, low-stock threshold triggers & pending alerts */
--status-warning: #f59e0b;
--status-warning-bg: rgba(245, 158, 11, 0.12);

/* Danger, cancellations, and error toasts */
--status-danger: #ef4444;
--status-danger-bg: rgba(239, 68, 68, 0.12);
```

### 2.3 Typographic Color Scale
```css
/* Primary high-contrast text for headers & key numbers */
--text-primary: #f8fafc;

/* Secondary text for table descriptions, meta labels, and subheadings */
--text-secondary: #94a3b8;

/* Tertiary text for timestamps, inactive states, and subtle hints */
--text-muted: #64748b;
```

---

## 3. Typography Hierarchy

The typographic system is built on the **Inter / Geist** sans-serif font family:

| Role | Font Size | Weight | Tracking / Line Height | Usage Example |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1** | `2.25rem` (36px) | `700` (Bold) | `-0.025em` / `1.2` | Primary Dashboard Revenue Metric |
| **Headline** | `1.5rem` (24px) | `600` (SemiBold) | `-0.02em` / `1.3` | Workspace Headers, Modal Titles |
| **Subhead** | `1.125rem` (18px) | `500` (Medium) | `-0.01em` / `1.4` | KOT Ticket Numbers, Table Labels |
| **Body Primary**| `0.875rem` (14px) | `400` (Normal) | `0em` / `1.5` | Menu Item Descriptions, Notes |
| **Caption / Tag**| `0.75rem` (12px) | `600` (SemiBold) | `+0.05em` / `1.0` | Status Badges (`SERVED`, `COOKING`) |
| **Mono Metrics**| `0.875rem` (14px) | `500` (Medium) | `0em` / `1.0` | Prices, Totals, Quantities |

---

## 4. Component Styling & Interactive Behaviors

### 4.1 Buttons & Touch Surfaces
- **Primary Actions** ("Settle Bill", "Place Order"): Gradient amber background (`from-amber-500 to-amber-600`), high-contrast dark text (`text-neutral-950`), subtle box shadow (`shadow-[0_0_20px_rgba(217,119,6,0.3)]`), and a tactile `:active` scale of `0.98`.
- **Secondary Actions** ("Cancel", "Print"): Bordered slate container (`border-zinc-700 bg-zinc-900/60 text-zinc-200`) with hover lightening.

### 4.2 Status Badges (KOT & Orders)
- Status badges use rounded pill containers (`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase`) with semi-transparent tinted backgrounds and matched 1px borders:
  - `PENDING`: Zinc neutral (`bg-zinc-800/80 text-zinc-300 border-zinc-700`)
  - `COOKING` / `PREPARING`: Amber radiance (`bg-amber-950/40 text-amber-400 border-amber-800/60 animate-pulse`)
  - `SERVED` / `READY`: Emerald glow (`bg-emerald-950/40 text-emerald-400 border-emerald-800/60`)
  - `CANCELLED`: Crimson muted (`bg-rose-950/40 text-rose-400 border-rose-800/60`)

### 4.3 Cards & Modals
- **Backdrop Blur**: Modals and sticky headers utilize `backdrop-blur-md bg-black/70` for spatial depth.
- **Card Enclosures**: Standard card components feature a `1px` subtle border (`border-zinc-800/80`) on an obsidian slate fill (`bg-zinc-900/40`), eliminating visual noise while maintaining clear division.

---

## 5. Responsive Layout & Mobile Usability

1. **Guest Mobile First**: The QR guest view (`/guest/menu`, `/guest/lobby`) is designed for single-hand thumb navigation on mobile viewports (360px–430px width). Bottom-sheet cart drawers and large touch targets (`min-h-[44px]`) ensure effortless order dispatch.
2. **Host Dual-Mode Layout**: The host POS and KOT boards are optimized for both iPad/Android tablet landscape orientation (1024px) and full desktop widescreen displays (1920px), featuring responsive grid re-flow.
