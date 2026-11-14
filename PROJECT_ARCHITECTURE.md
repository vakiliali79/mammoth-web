# Project architecture — MAMMOTH CAFE

## 1. Overview

```
Browser ──► Nginx ──► Next.js (one Node process, PM2)
                         │
                         ├─ app/[locale]/…      server-rendered public pages (fa, en)
                         ├─ app/admin/…         admin UI + Server Actions
                         ├─ app/media/[name]    uploaded images
                         │
                         └─ lib/data/repository ──► DataStore (interface)
                                                       └─ JsonFileStore → DATA_DIR/store.json
                                                    uploads → DATA_DIR/uploads/*.webp
```

Design goals, in order: the visual quality of the hero, mobile performance, and the fewest
moving parts that a small cafe site needs (one process, no database server, no external
services).

## 2. Routing and languages

- Public pages live under `src/app/[locale]/`. `src/proxy.ts` rewrites `/…` to `/fa/…`
  internally, serves English under `/en/…`, and redirects `/fa/…` to the canonical
  un-prefixed URL.
- `[locale]/layout.tsx` is a root layout: it sets `<html lang dir>`, fonts, metadata,
  header/footer and JSON-LD. The admin area has its own root layout (`app/admin/layout.tsx`).
- UI strings are in `src/lib/i18n/fa.ts` / `en.ts` (`en` is type-checked against `fa`).
  Menu data carries both `nameFa` and `nameEn`; `pick()` falls back to Persian.
- Unknown URLs fall into `[locale]/[...rest]` → branded 404 with a real 404 status.
- Public pages are rendered per request (`dynamic = "force-dynamic"`), so admin edits are
  visible immediately. The store is cached in memory and re-read only when the file changes.

## 3. The signature animation

Files: `src/components/hero/HeroExperience.tsx` and `src/components/hero/scene/`.

### What is real 3D and what is not

Everything in the picture is rendered live by Three.js — there is no video and no image
sequence. All geometry is generated in code; there are no downloaded models or textures.

| Element | Technique |
| --- | --- |
| Cup, saucer | `LatheGeometry` from hand-written profiles (wall thickness, foot ring, rounded lip, saucer well). Handle is a `TubeGeometry` along a spline. `MeshPhysicalMaterial` with clearcoat = glazed ceramic |
| Lighting | A shadow-casting key spotlight, warm and cool rim lights, and an environment map baked at start-up from a small procedural "photo studio" (emissive softboxes) with `PMREMGenerator` — that is where the glaze reflections come from |
| Coffee surface | A subdivided disc that rises inside the cup; its radius follows the cup's inner profile exactly (`innerRadius()`), so the liquid always meets the wall. `MeshPhysicalMaterial` extended via `onBeforeCompile` |
| Crema | Fragment shader: domain-warped fractal noise in differentially rotated coordinates (centre turned further than the rim → spiral marbling), a colour ramp from dark coffee to pale crema, fine "tiger" flecking, micro-bubbles (cellular noise) near the rim and the pour point, per-pixel roughness (dark coffee is mirror-like, crema is matte) |
| Liquid motion | Vertex displacement + matching normal perturbation from a wave function: travelling waves scaled by an *agitation* value, and concentric ripples around the pour point. A damped spring tilts the surface when the cup accelerates, so the coffee sloshes when the cup lands and then settles |
| Pour stream | A cylinder whose radius is modulated in the vertex shader (wobble, gravity taper). It falls in from above, and at the end its tail drops into the cup |
| Steam | Two camera-facing sheets with a shader of advected, domain-warped noise shaped into a column that drifts and widens with height. Time-driven, so it keeps moving when scrolling stops |
| Shadows | Real shadow map (cup on saucer, cup on liquid, everything on the ground) plus soft contact-shadow sprites that tighten as the cup comes down |

This is a carefully art-directed real-time scene, **not** a fluid-dynamics simulation: the
surface behaviour is procedural (noise + springs), which is what makes it run on phones.

### Scroll control

`HeroExperience` builds one GSAP timeline bound to a pinned `ScrollTrigger`
(`pin: true, scrub: 0.85`, ~5 viewport heights of scroll). The timeline tweens a plain
object — `scene.state` (cup height, spin, fill, pour, steam, warmth, camera position/target,
frame shift) — and the DOM captions. The scene reads that state every frame. Scrolling
backwards rewinds everything.

| Timeline | Scene |
| --- | --- |
| 0 – 12 % | **Introduction.** Empty cup hovering above its saucer, wordmark behind it, headline |
| 8 – 45 % | **Pour.** Camera rises to look into the cup; the stream falls, the cup fills, crema forms and swirls |
| 44 – 62 % | **Placement.** Camera swings to a low three-quarter view; the cup descends, the saucer dips and springs back, the coffee sloshes |
| 60 – 82 % | **Steam & detail.** Steam rises, warm back-light fades in, close-up of the crema |
| 80 – 100 % | **Reveal.** Slow push-in, the backdrop warms, closing line + menu button; the page then scrolls on |

### Performance and fallbacks

- Three.js, GSAP and the scene are **dynamically imported** — they are not in the initial
  JS bundle, and the headline is server-rendered text.
- The render loop runs only while the hero is on screen and the tab is visible, and **skips
  frames when nothing changed** (no steam, no pour, no motion) — an idle intro costs no GPU.
- Two quality tiers: phones / coarse pointers / ≤ 4 cores get lower geometry detail, a
  1024 px shadow map and a pixel-ratio cap of 1.5 (desktop: 2048 px, cap 2).
- On portrait screens the camera pulls back (`scene.fit`) and captions move to the bottom.
- `prefers-reduced-motion`: no pinning or scrubbing; one still frame of the finished cup.
- No WebGL: `public/images/hero-poster.jpg` (a render of the same scene) is shown.

### Tuning

- Camera path, timing, captions: the timeline in `HeroExperience.tsx`.
- Cup shape: profiles in `scene/geometry.ts`. Colours, crema, steam: `scene/shaders.ts`.
- Lights and materials: constructor of `scene/CoffeeScene.ts`.

## 4. Data layer

```
src/lib/data/
  types.ts        domain types (Category, MenuItem, GalleryImage, SiteSettings, SiteData)
  schema.ts       Zod schemas for every admin write
  seed.ts         DEMO data, written once on first start
  store.ts        DataStore interface + JsonFileStore (atomic writes, serialised updates)
  repository.ts   the only API the app uses: getPublicMenu(), createItem(), saveSettings()…
```

`store.json` is written atomically (temp file + rename) and all updates go through one
promise queue, so concurrent admin actions cannot corrupt it.

### Moving to PostgreSQL later

Nothing outside `src/lib/data/` knows how data is stored. To switch:

1. Add Prisma with models mirroring `types.ts` (`Category`, `MenuItem` with a JSON
   `variants` column, `GalleryImage`, a single-row `Settings`, and `featured` as an ordered
   relation).
2. Either implement `DataStore` (`read()` / `update()`) on top of Prisma for a drop-in swap,
   or — better for larger data — re-implement the functions in `repository.ts` as direct
   queries. Their signatures are what pages and actions depend on.
3. Import the current `store.json` with a one-off script, then set `DATABASE_URL`.

Uploaded images can stay on disk or move to object storage by changing `src/lib/uploads.ts`
and the `/media/[name]` route.

## 5. Admin and security

- **No default credentials.** `ADMIN_PASSWORD_HASH` is a salted scrypt hash created by
  `npm run admin:setup`; the format avoids `$` so `.env` parsing cannot corrupt it.
- **Sessions** are stateless tokens `payload.HMAC-SHA256`, stored in an `httpOnly`,
  `SameSite=Lax`, `Secure` cookie scoped to `/admin`, valid 12 h. The signing key is derived
  from `SESSION_SECRET` *and* the password hash, so changing the password invalidates all
  sessions. Comparisons are constant-time.
- **Authorisation** is checked in the panel layout **and at the top of every Server Action**
  (`requireAdmin()`), because actions are directly callable HTTP endpoints. Next.js also
  rejects cross-origin action requests (Origin/Host check).
- **Login throttling:** 5 failures per address per 15 minutes (in memory).
- **Validation:** all input goes through Zod (lengths, numeric ranges, slug and URL formats,
  image paths restricted to `/images/…` or `/media/…`).
- **Uploads:** size-limited, decoded and re-encoded to WebP with sharp (so the stored bytes
  are never the uploaded bytes and metadata is stripped), saved under a random UUID. The
  media route only serves names matching `<uuid>.webp`.
- **Headers:** `nosniff`, `SAMEORIGIN`, a referrer policy, a restrictive permissions policy,
  and `X-Robots-Tag: noindex` on `/admin`. Secrets are only read in server-only modules.

Not included (reasonable next steps if needs grow): multiple admin users/roles, audit log,
2FA, a Content-Security-Policy header.

## 6. Styling

Tailwind CSS 4, tokens in `globals.css` (`--color-espresso`, `--color-cream`, …). Layout uses
logical properties / `rtl:` `ltr:` variants so both directions share one codebase. Persian
text is set in Vazirmatn; Latin display text in Fraunces (also used for English headings).
Section reveals are CSS transitions triggered by one small IntersectionObserver component;
image drift uses CSS scroll-driven animations where supported.

## 7. SEO

Per-locale `generateMetadata` (title template, description, canonical, hreflang
alternates, Open Graph/Twitter with `public/og.jpg`), `sitemap.ts`, `robots.ts` (admin
disallowed), and `CafeOrCoffeeShop` JSON-LD that only includes contact fields that have
actually been filled in.

## 8. Testing

- `npm test` — Node's test runner: password hashing, token forgery/expiry, rate limiter,
  validation schemas, search normalisation.
- `npm run test:e2e` — Playwright against a production build with software WebGL: hero
  pinning and scrubbing (distinct frames per scroll position, rewind), idle steam motion,
  reduced motion, mobile overflow and navigation, menu search/categories, i18n, 404, SEO
  files, broken links/images, and the full admin flow (login, validation errors, category and
  product CRUD with image upload, inline price, availability, featured, settings, gallery,
  logout).
