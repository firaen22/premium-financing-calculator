# Scoped refactor proposal — premium-financing-calculator

Written after the mobile/bugfix pass of 2026-07-30. **Nothing here is done.** This is the
proposal you asked for; each tier is independently approvable.

The bugfix pass deliberately did *not* refactor, for one reason: **there is no test
suite.** Every correctness claim in that pass was verified by a throwaway probe script
plus a browser. That is fine for a bounded diff; it is not enough to safely move 60
props around. So Tier 0 comes first — it is what makes the rest safe.

---

## Tier 0 — Make refactoring possible (do this first, ~half a day)

Without this, every later tier is a blind change.

1. **Add Vitest and freeze the engine's current behaviour as a golden test.**
   `src/utils/calculations.ts` is pure — it takes a plain object and returns a plain
   object. That makes it trivially testable and it is where all the money lives.
   - Port the throwaway probe used in the bugfix pass into `src/utils/calculations.test.ts`.
     It already encodes 21 assertions and ~936 swept input configurations, including the
     invariant that matters most: **zero rate shock ⇒ stressed projection equals baseline**.
   - Snapshot `calculateProjection(defaults).projectionData` so any future arithmetic
     change has to be acknowledged rather than discovered by a client.
2. **Extract `calculatePMT` out of `useAppState` into `calculations.ts` and export it.**
   It is pure arithmetic living inside a React hook, which is the only reason it could
   not be unit-tested and the reason its divide-by-zero survived. ~5 lines moved.

Acceptance: `npm test` runs, and reverting any one of the money-path fixes makes it red.

---

## Tier 1 — Kill the prop wall (highest value, ~1 day)

**The problem, concretely:** `Sidebar` declares **60 props**. `App.tsx` spends ~60 lines
threading them. Adding one field to the model means editing three files. This is also how
the duplicated-derivation bug happened: `Sidebar` recomputed `pfEquity` from raw props
while the engine computed it from *sanitized* values, so the number on screen could
disagree with the projection. The bugfix pass patched that one instance by passing a
`derived` object — it did not fix the pattern.

**Proposed shape:**

```
src/state/AppStateContext.tsx
  export const AppStateProvider  // wraps useAppState()
  export const useApp()          // typed consumer
```

- `useAppState` stays exactly as-is — it becomes the provider's value. No logic moves,
  so there is nothing to get wrong arithmetically.
- `Sidebar`, `Header`, and the five views call `useApp()` instead of receiving props.
- `Sidebar`'s props collapse from 60 to 3 genuinely-local ones: `isMobileOpen`,
  `onMobileClose`, `onCollapsedChange`.

**Why a context and not Zustand/Redux:** the state is already a single hook with no
async writes and no cross-tab concerns. A context is ~30 lines and zero dependencies.
Reach for a store only if you later need selector-level re-render control.

**Risk:** context re-renders every consumer on any change. With a 30-row × 30-year
projection and `useMemo` already in place this is very unlikely to matter — but measure
before and after with React DevTools Profiler rather than assuming. If it does bite,
split into two contexts (inputs vs derived outputs) rather than adding a store.

---

## Tier 2 — Type the UI primitives (~2 hours)

`InputField`, `SelectField`, `ToggleField`, and `KPICard` are all typed `({...}: any)`.
`Sidebar`'s `labels` and `addNotification` are `any`, and every view takes `t: any`.

- Give the four primitives real prop interfaces.
- Type the i18n dictionary once: `export type Labels = typeof TRANSLATIONS['en']`, then
  `t: Labels` everywhere. This turns every `labels.someKeyThatDoesNotExist` into a
  compile error. Several call sites already hedge with `labels.loanInterest || 'Loan
  Interest'`, which is exactly the smell this removes.

---

## Tier 3 — Two known warts (~2 hours, optional)

1. **`InputField` erases in-progress keystrokes.** `value={value === 0 ? "" : value}`
   plus `"" → onChange(0)` means typing `0.5` shows nothing after `0`, nothing after
   `0.`, then jumps to `0.5`. Verified in-browser: the **final value is correct**, so this
   is cosmetic, not a correctness bug — which is why it was left alone. The fix is a local
   draft string in `InputField`, committing to the parent on change/blur. Worth doing once
   there are tests, because it touches every money field.
2. **A real `0` renders as a blank field** (placeholder `0`), so "zero" and "empty" look
   identical. Same fix as above.

---

## Tier 4 — Production hygiene (~half a day)

1. **Replace the Tailwind Play CDN** (`index.html`) with the real build-time plugin. The
   CDN is a browser-side JIT compiler: it is render-blocking, logs
   `cdn.tailwindcss.com should not be used in production` on every load, and means the
   app has no `tailwind.config.js` — so no custom breakpoints, no theme tokens, and the
   brand colours are re-typed as arbitrary values (`bg-[#c5a059]`) in dozens of places.
   Installing it properly also lets `THEME` in `src/constants/theme.ts` and the Tailwind
   palette become one source of truth. Biggest single mobile-performance win available.
2. **Split the 1.33 MB main bundle** (385 KB gzipped). `recharts` is the bulk and is only
   needed by four views; they are already lazy-load candidates the way `PDFPreview` and
   `PDFProposal` already are. On a 4G phone this is the difference users actually feel.
3. **Dead state:** `useAppState` exports `isFullPayment`/`setIsFullPayment`, but `Sidebar`
   keeps its own local `isFullPayment` and never reads the hook's. One of the two is dead —
   delete the hook's copy. Also `fetchError`/`setFetchError` appear unused.

---

## Explicitly NOT recommended

- **Do not make `PDFProposal.tsx` or `DetailedCalculationTable.tsx` responsive.** Their
  fixed `w-[297mm] h-[210mm]`, `grid-cols-5`, and `text-[6px]` are a deliberate A4
  landscape print canvas rendered off-screen for PDF capture. "Fixing" those would break
  the generated PDF. They were excluded from the mobile pass for this reason.
- **Do not add a state-management library** before Tier 1 shows a measured need.
- **Do not chase the `text-[9px]`/`text-[10px]` eyebrow labels globally.** The ones
  carrying real information were raised; the rest are decorative and legible enough at
  their size. A blanket sweep would flatten the visual hierarchy the design depends on.

---

## Suggested order

`Tier 0 → Tier 1 → Tier 2`, stopping after any tier. Tier 0 alone is worth doing even if
you never refactor, because it protects the money path. Tier 4.1 and 4.2 are independent
of everything else and can be picked up whenever mobile performance becomes a priority.
