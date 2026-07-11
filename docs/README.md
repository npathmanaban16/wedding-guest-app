# Tetherly landing page & static docs

Self-contained static site served from this folder. No build step.

Files:
- `index.html` — landing page (tetherly-app.com)
- `policies.html` — the older index that just linked to policies (kept for the old URL)
- `tetherly-privacy-policy.html` — privacy policy
- `tetherly-support.html` — support page
- `privacy-policy.html` — legacy Neha & Naveen wedding policy
- `favicon.png` — copy of the app icon (drop a real favicon here to replace)
- `CNAME` — custom domain for GitHub Pages

## Deploying

**Option A — GitHub Pages (simplest).** In the repo settings, set Pages to serve
from the `main` branch, `/docs` folder. The `CNAME` file already declares
`tetherly-app.com`. Point your DNS at GitHub Pages:

- `A` records for the apex `tetherly-app.com` to GitHub's IPs
  (185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153)
- `CNAME` record for `www.tetherly-app.com` → `<your-github-username>.github.io`

**Option B — Vercel / Netlify.** Connect the repo, set the output directory to
`docs`, add `tetherly-app.com` as a custom domain, follow the DNS instructions
they give you. You get preview URLs on every PR.

## Editing the landing page

Everything is in a single `index.html` with an inline `<style>` block. Fonts
come from Google Fonts; SVG icons are inlined. Palette variables live in
`:root` at the top of the stylesheet — change one and it cascades.

The waitlist form uses `mailto:` by default so submissions land in
`tetherly.app@gmail.com` without any backend. When you're ready, swap the
`<form action=...>` to a Formspree, Loops, ConvertKit, or Buttondown endpoint
— field names (`email`, `role`) are already sensible.

The phone mockup in the hero is drawn in CSS. Replace it with a real
screenshot when the app has one you love; the `.hero-visual` container is a
drop-in for an `<img>`.
