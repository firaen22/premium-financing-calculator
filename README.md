# Premium Financing Calculator

An illustration tool for Hong Kong premium-financing cases: a client funds a life policy
partly with their own capital and partly with a bank loan, and this models what that
structure does over 30 years — cashflow, equity, and what happens when rates move against
it. Built for an advisor to sit with a client and change assumptions live, then hand over a
branded PDF.

Live at <https://premium-financing-calculator.vercel.app>.

> Illustrative projections only. Output depends entirely on the assumptions entered and is
> not financial advice or an offer of terms.

## What it models

**Two funding sources.** Either the client pays from cash, or they refinance a property and
put the released equity in. The mortgage path is modelled properly rather than treated as
free money: LTV against the property, the existing loan, the HIBOR-plus-spread versus
prime-minus-discount rate choice HK lenders actually offer, tenor, and the resulting
amortising payment that runs against the projection every year.

**The loan on the policy.** Priced off either HIBOR or the bank's cost of funds, plus a
spread, subject to a cap rate. Live 1-month HIBOR is pulled from the HKMA public API
(`api/hibor.ts`) and can be overridden by hand.

**Where it can go wrong.** A stress view shocks HIBOR and drops bond prices to show the
loan-to-value trajectory and the margin-call picture, with a sensitivity heatmap across
rate and year.

## The six views

| View | What it answers |
|---|---|
| Allocation Structure | Where the money goes on day one, and the resulting cashflow |
| Return Studio | Year-by-year returns, with the interest actually charged |
| Holdings Analysis | The full 30-year ledger |
| Market Risk | Stress test, LTV trajectory, sensitivity heatmap |
| Report Review | The nine-page client PDF, on screen before you send it |
| System Configuration | Bank-side limits and regulatory mode |

English, Traditional Chinese, and Simplified Chinese throughout — including the PDF.

## Running it

Requires Node 20+.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>. `npm run build` emits to `dist/`, `npm run preview`
serves that build, and `npm test` runs the suite.

## Tests

`npm test` is not a smoke test — two things in it are load-bearing, and both exist because
this app can be wrong without looking wrong.

**The golden projection snapshot** (`src/utils/calculations.test.ts`) pins the whole 30-year
output to the real `DEFAULT_INPUTS`, not to a copy. Changing a default has to be
acknowledged by updating the snapshot, so a number cannot quietly drift.

**The wiring gate** (`src/state/wiring.test.ts`) reads the component sources and fails if a
view pulls an engine field straight off `useApp()` instead of from `.projection` /
`.stressTest`. Most such mistakes render blank or `NaN`, but `monthlyMortgagePmt` exists in
both places holding *different* numbers, so that one is silently wrong. The gate also holds
the props interfaces at their post-refactor size.

**CI** (`.github/workflows/debt-gate.yml`) runs `tsc --noEmit` and `vitest run` on every
push and PR, since neither is wired into `npm test` on its own — `tsc` catches the
`zh_hk`/`zh_cn` i18n parity check, which is compile-time only.

## PDF generation

Two paths, and the difference matters when debugging output.

The primary path posts the report markup **and the page's compiled stylesheet** to
`/api/generate-pdf`, which renders it with headless Chromium, stores the result in
Cloudflare R2, and returns a signed URL. Sending the stylesheet is deliberate: it pins the
PDF to the same CSS the user is looking at. Note that the report is hidden in-app by
`.pdf-only { display: none }`, so the renderer wraps the markup in `.force-preview` to
switch it back on — remove that and the PDF comes back empty.

If the endpoint is unavailable, the client falls back to `html2canvas` + `jsPDF` in the
browser. This is why Tailwind is pinned to v3: v4's oklch colours cannot be parsed by
html2canvas 1.4.1, so upgrading would break the fallback.

## Deploying

Vercel, from `main`. It has to be a platform that runs the `api/` functions — the app was
previously published to GitHub Pages, where those endpoints could not exist and PDF
generation silently fell back to the browser every time.

Server-side PDF generation needs these environment variables:

```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

Without them the endpoint returns a configuration error and the client falls back.

## Working on it

- **Tailwind is compiled at build time**, not loaded from the Play CDN. Class names are
  scanned out of the source text, so a class assembled at runtime
  (`` `text-${color}-500` ``) ships unstyled with no error. Keep them whole literals.
- **Do not add keys to `zh_cn`.** It is generated from `zh_hk` at module load. Add to `en`
  and `zh_hk`; a key missing from either fails the type check.
- **State lives in context**, not props — `useApp()` for figures, `useServices()` for
  actions like PDF and CSV export.

## Built with

React 19, TypeScript, Vite 6, Tailwind CSS 3.4, Recharts, Vitest, Puppeteer on Vercel
functions.
