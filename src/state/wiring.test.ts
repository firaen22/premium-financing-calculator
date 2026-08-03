// Acceptance gate for the Tier 1 context refactor.
//
// Why a test that reads source text: tsc, the calculations.test.ts golden suite, and
// `npm run build` can ALL pass while a view shows a wrong or missing number, because none
// of them look at view wiring.
//
// The 16 names in ENGINE_FIELDS live inside `projection` / `stressTest`. Reading one off
// `useApp()` at the top level fails in two different ways:
//   - 15 of them simply aren't there, so the read is `undefined` — which renders as blank,
//     formats as NaN, or throws on `.map`.
//   - `monthlyMortgagePmt` IS there, holding a different number (check 1 proves it), so
//     that read fails silently instead of loudly. Today AllocationView's two render sites
//     for it are both gated on `fundSource === 'mortgage'` (AllocationView.tsx:88 and
//     :112), and in that branch the two values coincide — so the collision is currently
//     latent, not visible. It is guarded here because it is the one case where getting the
//     wiring wrong produces no symptom at all until someone un-gates the row.
//
// These are static checks, not renders. Rendering would need jsdom +
// @testing-library/react, i.e. two new dependencies, to catch a class of error that a
// source-level invariant catches for free. If component tests are added later, checks
// 2-3 become redundant and should be deleted rather than kept alongside.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    calculateProjection, calculatePMT,
    deriveUnlockedCash, deriveEffectiveMortgageRate
} from '../utils/calculations';
import { DEFAULT_INPUTS } from '../constants/defaults';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/**
 * Engine fields that live INSIDE `projection` or `stressTest`. Reading any of these as a
 * top-level key off `useApp()` is the bug this gate blocks: for `monthlyMortgagePmt` the
 * two sources hold genuinely different numbers, and for the rest a top-level read is
 * simply `undefined`, which renders as a blank or NaN rather than throwing.
 */
const ENGINE_FIELDS = [
    'pfEquity', 'totalPremium', 'bankLoan', 'effectiveRate', 'projectionData',
    'finalNetEquity', 'roi', 'monthlyBondIncome', 'monthlyLoanInterest',
    'monthlyNetCashflow', 'oneOffBondFee', 'netBondPrincipal', 'monthlyMortgagePmt',
    'stressedProjection', 'stressStats', 'sensitivityData',
    // Phase 4 rebate/fee scalars the ENGINE alone produces — the PDF reads these, so
    // the top-level-vs-`projection` trap applies. bankCashRebate and fundFeeRebate are
    // deliberately NOT listed: they became dual-role when the Sidebar gained input
    // fields for them — a top-level editable input that the engine echoes back
    // sanitized. Sidebar's top-level read is the correct one for editing; the PDF
    // reads the projection copy. The two copies differ only when the input is
    // out-of-range (negative/NaN), which sanitize() clamps.
    'policyRebate', 'policyRebateRate', 'assetLoanFee', 'belowMinPremium',
    // Capital bases the engine resolves after sanitising and clamping its two capital
    // inputs. `deployedCapital` is the trap of the pair: a top-level read would find
    // nothing, but the nearby `budget` is a plausible-looking substitute that silently
    // drops the client's injected cash from every allocation display.
    'ownCapital', 'deployedCapital',
];

const COMPONENTS = [
    'components/layout/Sidebar.tsx',
    'components/layout/Header.tsx',
    'views/AllocationView.tsx',
    'views/HoldingsView.tsx',
    'views/MarketRiskView.tsx',
    'views/ReturnStudio.tsx',
    'views/SystemConfigView.tsx',
    'views/PDFPreview.tsx',
    'components/ui/GuidePanel.tsx',
    'components/ui/ChatWidget.tsx',
    'App.tsx',
];

/** Every `const { ... } = useApp()` destructure body in a file, brace contents only. */
const useAppDestructures = (src: string): string[] => {
    const out: string[] = [];
    const re = /(?:const|let)\s*\{([\s\S]*?)\}\s*=\s*useApp\(\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) out.push(m[1]);
    return out;
};

/** Top-level keys of a destructure body, ignoring nested braces and renames' targets. */
const topLevelKeys = (body: string): string[] => {
    const keys: string[] = [];
    let depth = 0, cur = '';
    for (const ch of body) {
        if (ch === '{' || ch === '[') { depth++; cur += ch; continue; }
        if (ch === '}' || ch === ']') { depth--; cur += ch; continue; }
        if (ch === ',' && depth === 0) { keys.push(cur); cur = ''; continue; }
        cur += ch;
    }
    keys.push(cur);
    return keys
        // `a: b` destructures key `a`; default values (`a = 1`) still key on `a`.
        .map(k => k.split(':')[0].split('=')[0].trim())
        .filter(k => k.length > 0 && !k.startsWith('...'));
};

/** Member count of `interface <Name> { ... }`, counting only top-level `key:` lines. */
const interfaceMemberCount = (src: string, name: string): number | null => {
    const start = src.indexOf(`interface ${name}`);
    if (start === -1) return null;
    const open = src.indexOf('{', start);
    let depth = 0, end = -1;
    for (let i = open; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    const body = src.slice(open + 1, end);
    let d = 0, count = 0;
    for (const line of body.split('\n')) {
        const t = line.trim();
        if (d === 0 && /^[A-Za-z_$][\w$]*\??\s*:/.test(t)) count++;
        d += (line.match(/[{(]/g) || []).length - (line.match(/[})]/g) || []).length;
    }
    return count;
};

describe('Tier 1 wiring gate', () => {
    it('1. the engine gates monthlyMortgagePmt, so the two sources really do differ', () => {
        // Defaults use fundSource 'cash'. Built exactly the way useAppState builds it.
        const unlockedCash = deriveUnlockedCash(
            DEFAULT_INPUTS.propertyValue, DEFAULT_INPUTS.mortgageLtv, DEFAULT_INPUTS.existingMortgage);
        const effectiveMortgageRate = deriveEffectiveMortgageRate(
            DEFAULT_INPUTS.hibor, DEFAULT_INPUTS.mortgageHSpread,
            DEFAULT_INPUTS.primeRate, DEFAULT_INPUTS.mortgagePModifier);
        const rawPmt = calculatePMT(effectiveMortgageRate, DEFAULT_INPUTS.mortgageTenor, unlockedCash);

        const projection = calculateProjection({
            budget: DEFAULT_INPUTS.budget, cashReserve: DEFAULT_INPUTS.cashReserve,
            bondAlloc: DEFAULT_INPUTS.bondAlloc, bondYield: DEFAULT_INPUTS.bondYield,
            hibor: DEFAULT_INPUTS.hibor, cofRate: DEFAULT_INPUTS.cofRate,
            interestBasis: DEFAULT_INPUTS.interestBasis, spread: DEFAULT_INPUTS.spread,
            leverageLTV: DEFAULT_INPUTS.leverageLTV, capRate: DEFAULT_INPUTS.capRate,
            handlingFee: DEFAULT_INPUTS.handlingFee, fundSource: DEFAULT_INPUTS.fundSource,
            unlockedCash, effectiveMortgageRate, monthlyMortgagePmt: rawPmt,
            mortgageTenor: DEFAULT_INPUTS.mortgageTenor,
        });

        // The raw payment is real money; the projection deliberately reports 0 on 'cash'.
        expect(rawPmt).toBeGreaterThan(0);
        expect(projection.monthlyMortgagePmt).toBe(0);
        expect(projection.monthlyMortgagePmt).not.toBe(rawPmt);
    });

    it('2. no component pulls an engine field out of useApp() at the top level', () => {
        const offences: string[] = [];
        for (const rel of COMPONENTS) {
            let src: string;
            try { src = read(rel); } catch { continue; }
            for (const body of useAppDestructures(src)) {
                for (const key of topLevelKeys(body)) {
                    if (ENGINE_FIELDS.includes(key)) {
                        offences.push(`${rel}: '${key}' destructured from useApp() directly; ` +
                            `read it from useApp().projection / .stressTest instead`);
                    }
                }
            }
        }
        expect(offences).toEqual([]);
    });

    it('3. no component aliases the whole context to the name `projection`', () => {
        // `const projection = useApp()` would make `projection.monthlyMortgagePmt` read the
        // top-level field while looking exactly like a correct nested read.
        const offences: string[] = [];
        for (const rel of COMPONENTS) {
            let src: string;
            try { src = read(rel); } catch { continue; }
            if (/(?:const|let)\s+(projection|stressTest)\s*=\s*useApp\(\)/.test(src)) {
                offences.push(`${rel}: aliases the entire context as projection/stressTest`);
            }
        }
        expect(offences).toEqual([]);
    });

    it('4. the prop wall is actually gone, not just moved', () => {
        expect(interfaceMemberCount(read('components/layout/Sidebar.tsx'), 'SidebarProps')).toBe(3);
        expect(interfaceMemberCount(read('components/layout/Header.tsx'), 'HeaderProps')).toBe(1);
        expect(interfaceMemberCount(read('views/PDFPreview.tsx'), 'PDFPreviewProps')).toBe(1);

        // These five should have no props interface left at all.
        for (const [rel, name] of [
            ['views/AllocationView.tsx', 'AllocationViewProps'],
            ['views/HoldingsView.tsx', 'HoldingsViewProps'],
            ['views/MarketRiskView.tsx', 'MarketRiskViewProps'],
            ['views/ReturnStudio.tsx', 'ReturnStudioProps'],
            ['views/SystemConfigView.tsx', 'SystemConfigViewProps'],
        ] as const) {
            expect(interfaceMemberCount(read(rel), name), `${rel} should take no props`).toBeNull();
        }
    });

    it('6. every input the sidebar edits reaches the engine', () => {
        // extraCash existed as a state field, a labelled sidebar input and an engine input
        // for months without the three ever being connected: useAppState simply left it
        // out of simulationInput, so typing into Input Cash changed nothing the engine
        // saw. Nothing else in the suite fails when a field is dropped here — the object
        // is structurally typed against SimulationInput, whose optional fields tsc is
        // happy to see omitted.
        const src = read('hooks/useAppState.ts');
        const start = src.indexOf('const simulationInput');
        expect(start, 'useAppState must build a simulationInput').toBeGreaterThan(-1);
        const body = src.slice(start, src.indexOf('}), [', start));

        for (const field of ['budget', 'cashReserve', 'bondAlloc', 'extraCash', 'fundSource']) {
            expect(body, `simulationInput omits '${field}'`).toMatch(new RegExp(`\\b${field}\\b`));
        }
    });

    it('5. both context hooks fail loudly outside their provider', () => {
        for (const rel of ['state/AppStateContext.tsx', 'state/AppServicesContext.tsx']) {
            expect(read(rel), `${rel} must throw when used outside its provider`).toMatch(/throw new Error/);
        }
    });
});
