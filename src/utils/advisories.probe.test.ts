import { describe, it, expect } from 'vitest';
import { checkAssumptions, PLAUSIBILITY_RANGES, VALIDATED_FIELDS, type Finding } from './advisories';
import { calculateProjection, calculateStressTest, type SimulationInput } from './calculations';
import { renderMessage } from '../components/ui/AdvisoryBanner';
import { TRANSLATIONS } from '../i18n/translations';
import { DEFAULT_INPUTS } from '../constants/defaults';

// Ground-truth coverage probe. The unit tests in advisories.test.ts prove the CHECKER
// behaves; this file proves the RENDER path holds for everything the checker can emit.
// Every finding here comes from running the real engine + real checker, never a hand-built
// Finding object — a synthetic row is exactly how the year-0 mortgage false positive got
// through the last suite.

const base: SimulationInput = {
    budget: DEFAULT_INPUTS.budget,
    cashReserve: DEFAULT_INPUTS.cashReserve,
    bondAlloc: DEFAULT_INPUTS.bondAlloc,
    bondYield: DEFAULT_INPUTS.bondYield,
    hibor: DEFAULT_INPUTS.hibor,
    cofRate: DEFAULT_INPUTS.cofRate,
    interestBasis: DEFAULT_INPUTS.interestBasis,
    spread: DEFAULT_INPUTS.spread,
    leverageLTV: DEFAULT_INPUTS.leverageLTV,
    capRate: DEFAULT_INPUTS.capRate,
    handlingFee: DEFAULT_INPUTS.handlingFee,
    fundSource: DEFAULT_INPUTS.fundSource,
    unlockedCash: 0,
    effectiveMortgageRate: 4,
    monthlyMortgagePmt: 0,
    mortgageTenor: DEFAULT_INPUTS.mortgageTenor,
};

// Each case names the rule ids it MUST produce. Asserting only "everything that came out
// renders" was the hole three reviewers converged on: a rule that went permanently silent
// emitted nothing, the render loop iterated nothing, and the case passed while the advisor
// lost a blocker. `expect` is the gate; the third slot is what makes it one.
const CASES: Array<[string, Partial<SimulationInput>, string[]]> = [
    ['defaults', {}, []],
    ['over-allocated', { cashReserve: 3_000_000, bondAlloc: 2_000_000, budget: 4_000_000 },
        ['A1_ALLOCATION_EXCEEDS_BUDGET', 'A3_NO_POLICY_FUNDED']],
    ['no policy funded', { cashReserve: 4_000_000, bondAlloc: 0 }, ['A3_NO_POLICY_FUNDED']],
    ['cap binds', { capRate: 3 }, ['A4_CAP_BINDS_IMMEDIATELY']],
    ['stale cof', { interestBasis: 'cof', hibor: DEFAULT_INPUTS.hibor + 2 }, ['A5_STALE_COF_BASIS']],
    ['mortgage, no equity', { fundSource: 'mortgage', unlockedCash: 0 }, ['A6_NO_UNLOCKED_CASH']],
    // Verified against the real engine: underwater in the base case through year 4 AND
    // margin-called under stress from year 1. Before the `!negativeRow` guard was removed this
    // case reported only A9B, and the advisor never learned the stress case calls the loan.
    ['mortgage, big release', { fundSource: 'mortgage', unlockedCash: 4_500_000, monthlyMortgagePmt: 22_000 },
        ['A9B_UNDERWATER_PERIOD', 'A11_STRESS_MARGIN_CALL']],
    ['mortgage, small release', { fundSource: 'mortgage', unlockedCash: 300_000, monthlyMortgagePmt: 1_500 }, []],
    ['thin spread', { spread: 0.2 }, ['B_SPREAD_IMPLAUSIBLE']],
    ['fat spread', { spread: 3 }, ['B_SPREAD_IMPLAUSIBLE']],
    ['spread absurd', { spread: 8 }, ['B_SPREAD_OUT_OF_RANGE']],
    ['ltv over block', { leverageLTV: 97 }, ['B_LEVERAGE_LTV_OUT_OF_RANGE']],
    ['ltv over warn', { leverageLTV: 92 }, ['B_LEVERAGE_LTV_IMPLAUSIBLE']],
    ['bond yield high', { bondYield: 12 }, ['B_BOND_YIELD_OUT_OF_RANGE']],
    // 7% exceeds the IA illustration cap in every currency (6.0 HKD / 6.5 non-HKD) but stays
    // under the block bound; a LOW yield is deliberately clean — conservatism is not implausible.
    ['bond yield above IA cap', { bondYield: 7 }, ['B_BOND_YIELD_IMPLAUSIBLE']],
    ['cap rate high', { capRate: 13 }, ['B_CAP_RATE_IMPLAUSIBLE']],
    ['cap rate absurd', { capRate: 400 }, ['B_CAP_RATE_OUT_OF_RANGE']],
    ['handling fee high', { handlingFee: 5 }, ['B_HANDLING_FEE_IMPLAUSIBLE']],
    ['handling fee absurd', { handlingFee: 400 }, ['B_HANDLING_FEE_OUT_OF_RANGE']],
    ['tenor past HKMA cap', { mortgageTenor: 32, fundSource: 'mortgage', unlockedCash: 1_000_000 },
        ['B_MORTGAGE_TENOR_IMPLAUSIBLE']],
    ['tenor absurd', { mortgageTenor: 80, fundSource: 'mortgage', unlockedCash: 1_000_000 },
        ['B_MORTGAGE_TENOR_OUT_OF_RANGE']],
    ['hibor shock', { hibor: 12 }, ['B_HIBOR_IMPLAUSIBLE']],
    ['hibor absurd', { hibor: 400 }, ['B_HIBOR_OUT_OF_RANGE']],
    ['cof shock', { interestBasis: 'cof', cofRate: 12 }, ['B_COF_RATE_IMPLAUSIBLE']],
    ['cof absurd', { interestBasis: 'cof', cofRate: 400 }, ['B_COF_RATE_OUT_OF_RANGE']],
    ['budget absurd', { budget: 1e16 }, ['B_BUDGET_OUT_OF_RANGE']],
    // The ceiling on every money input, not just budget. Before these bounds existed, values this
    // size overflowed A1's arithmetic to Infinity and the over-budget blocker vanished.
    ['allocation absurd', { cashReserve: 1e308, bondAlloc: 1e308 },
        ['B_CASH_RESERVE_OUT_OF_RANGE', 'B_BOND_ALLOC_OUT_OF_RANGE']],
    ['mortgage figures absurd', { fundSource: 'mortgage', unlockedCash: 1e308, monthlyMortgagePmt: 1e308 },
        ['B_UNLOCKED_CASH_OUT_OF_RANGE', 'B_MONTHLY_MORTGAGE_PMT_OUT_OF_RANGE']],
    ['negative input', { spread: -1 }, ['B_SPREAD_INVALID']],
    ['NaN input', { bondYield: NaN }, ['B_BOND_YIELD_INVALID']],
    ['bad enum', { interestBasis: 'xxx' as unknown as 'hibor' }, ['STRUCT_INVALID_ENUM']],
    // An advisor who opens the tool and clears every field. One case covers all fourteen
    // B_*_INVALID ids, which no single-field case reaches — and which are exactly the ids that
    // fire when a real form is half-filled.
    ['blank form', Object.fromEntries(VALIDATED_FIELDS.map(f => [f, NaN])) as Partial<SimulationInput>,
        VALIDATED_FIELDS.map(f => `B_${f.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase()}_INVALID`)],
    ['stress margin call', { leverageLTV: 94, spread: 2.5 }, []],
];

const run = (patch: Partial<SimulationInput>): Finding[] => {
    const input = { ...base, ...patch };
    const projection = calculateProjection(input);
    const stress = calculateStressTest({
        projectionData: projection.projectionData, simulatedHibor: 9, bondPriceDrop: 30,
        showGuaranteed: false, totalPremium: projection.totalPremium,
        netBondPrincipal: projection.netBondPrincipal, bondYield: input.bondYield,
        bankLoan: projection.bankLoan, spread: input.spread, capRate: input.capRate,
        budget: input.budget, cashReserve: input.cashReserve, sensitivityYear: 10,
        fundSource: input.fundSource, unlockedCash: input.unlockedCash,
        interestBasis: input.interestBasis, cofRate: input.cofRate, hibor: input.hibor,
    });
    return checkAssumptions(input, projection, stress);
};

const LOCALES = ['en', 'zh_hk', 'zh_cn'] as const;

describe('advisory render coverage (real engine, real checker)', () => {
    const seen = new Set<string>();
    for (const [name, patch, expected] of CASES) {
        it(`renders every finding for: ${name}`, () => {
            const findings = run(patch);
            const got = findings.map(f => f.id);
            for (const id of expected) {
                expect(got, `${name}: expected ${id}, got [${got.join(', ')}]`).toContain(id);
            }
            for (const f of findings) {
                seen.add(f.id);
                for (const locale of LOCALES) {
                    const text = renderMessage(TRANSLATIONS[locale], f);
                    // A raw id reaching the UI means no template resolved for this rule.
                    expect(text, `${f.id} @ ${locale} fell through to the raw id`).not.toBe(f.id);
                    // An un-substituted placeholder means the template names a value the
                    // checker never puts in `values` — the advisor would read "{shortfall}".
                    expect(text, `${f.id} @ ${locale} left a placeholder: ${text}`).not.toMatch(/\{[a-zA-Z]+\}/);
                    expect(text.length, `${f.id} @ ${locale} rendered empty`).toBeGreaterThan(0);
                    expect(text, `${f.id} @ ${locale} rendered NaN/undefined`).not.toMatch(/NaN|undefined|Infinity/);
                    // Regression: rate values arrive pre-formatted with a "%", so a template
                    // that also writes one produces "5.00%%". Caught by three independent
                    // reviewers, invisible in the browser because the rules that hit it
                    // (a4/a5/a11WithLtv) never fired in the states checked by hand.
                    expect(text, `${f.id} @ ${locale} double percent: ${text}`).not.toMatch(/%%/);
                }
            }
        });
    }

    // Regression: a warning must quote the bound it actually breached. Before this, a 92%
    // LTV warning read "outside the usual range (≤95.00%)" — self-contradictory, and the
    // fastest way to teach an advisor the banner is noise.
    it('quotes the breached bound, not the other one', () => {
        const warn = run({ leverageLTV: 92 }).find(f => f.id === 'B_LEVERAGE_LTV_IMPLAUSIBLE');
        expect(warn, 'expected a warning at LTV 92 (warnMax 90, blockMax 95)').toBeDefined();
        const warnText = renderMessage(TRANSLATIONS.en, warn!);
        expect(warnText).toContain('90.00%');
        expect(warnText).not.toContain('95.00%');

        const block = run({ leverageLTV: 97 }).find(f => f.id === 'B_LEVERAGE_LTV_OUT_OF_RANGE');
        expect(block, 'expected a blocker at LTV 97').toBeDefined();
        const blockText = renderMessage(TRANSLATIONS.en, block!);
        expect(blockText).toContain('95.00%');
    });

    // Regression: exact equality is not "over budget"; A3 covers the zero-premium consequence.
    it('does not report a $0 overage at exact equality', () => {
        const findings = run({ budget: 4_000_000, cashReserve: 1_000_000, bondAlloc: 3_000_000 });
        expect(findings.map(f => f.id)).not.toContain('A1_ALLOCATION_EXCEEDS_BUDGET');
        expect(findings.map(f => f.id)).toContain('A3_NO_POLICY_FUNDED');
    });

    // Regression: a tenor is a count of years, not money and not a rate. Rendering it bare
    // ("of 80 (≤50)") leaves the unit to be inferred; rendering it as a percent — one
    // reviewer's suggested fix — would print "80.00%" for an 80-year term.
    it('gives a tenor its unit, in each locale', () => {
        const f = run({ mortgageTenor: 80, fundSource: 'mortgage', unlockedCash: 1_000_000 })
            .find(x => x.id === 'B_MORTGAGE_TENOR_OUT_OF_RANGE');
        expect(f, 'expected a blocker at an 80-year tenor (blockMax 50)').toBeDefined();
        expect(renderMessage(TRANSLATIONS.en, f!)).toContain('80 years');
        expect(renderMessage(TRANSLATIONS.en, f!)).not.toContain('%');
        expect(renderMessage(TRANSLATIONS.zh_hk, f!)).toContain('80 年');
    });

    // Regression: ending underwater is a blocker on its own evidence. This was gated behind an
    // intermediate negative row, so a projection that ends in the red without one produced no
    // finding at all — the worst possible failure for a rule whose job is to stop the proposal.
    it('blocks a projection that ends negative even with no negative row before it', () => {
        const input = { ...base };
        const projection = calculateProjection(input);
        const findings = checkAssumptions(input, {
            ...projection, finalNetEquity: -1,
            projectionData: [{ year: 0, netEquity: 5 }, { year: 1, netEquity: 5 }],
        } as never);
        const a9 = findings.find(f => f.id === 'A9_ENDS_NEGATIVE');
        expect(a9, 'ending underwater must block regardless of intermediate rows').toBeDefined();
        expect(a9!.severity).toBe('blocker');
        for (const locale of LOCALES) {
            expect(renderMessage(TRANSLATIONS[locale], a9!)).not.toMatch(/\{[a-zA-Z]+\}|NaN|undefined/);
        }
    });

    // Regression: the biggest funding gaps must not be the most quietly reported. The old
    // annualShortfall = |cashflow| x 12 overflowed to Infinity, failed a finite() check, and
    // downgraded the A8 blocker to the A7 warning.
    it('keeps an extreme funding gap a blocker rather than degrading it to a warning', () => {
        const input = { ...base, cashReserve: 1 };
        const projection = calculateProjection(input);
        const ids = checkAssumptions(input, { ...projection, monthlyNetCashflow: -1e308 } as never).map(f => f.id);
        expect(ids).toContain('A8_FUNDING_GAP');
        expect(ids).not.toContain('A7_NEGATIVE_YEAR1_CASHFLOW');
        // The overflow that used to suppress A8 must not resurface inside the sentence instead.
        const a8 = checkAssumptions(input, { ...projection, monthlyNetCashflow: -1e308 } as never)
            .find(f => f.id === 'A8_FUNDING_GAP')!;
        for (const locale of LOCALES) {
            expect(renderMessage(TRANSLATIONS[locale], a8)).not.toMatch(/Infinity|NaN|\{[a-zA-Z]+\}/);
        }
    });

    // Group-B bounds are EXCLUSIVE: a value exactly at blockMax is the limit of what a bank will
    // write, not past it. Asserted rather than left implicit, so flipping a comparison is a test
    // failure instead of a silent change in what advisors get stopped on.
    it('treats a value exactly at a bound as inside it', () => {
        expect(run({ leverageLTV: 95 }).map(f => f.id)).not.toContain('B_LEVERAGE_LTV_OUT_OF_RANGE');
        expect(run({ bondYield: 8 }).map(f => f.id)).not.toContain('B_BOND_YIELD_OUT_OF_RANGE');
        expect(run({ mortgageTenor: 35, fundSource: 'mortgage', unlockedCash: 1_000_000 }).map(f => f.id))
            .not.toContain('B_MORTGAGE_TENOR_OUT_OF_RANGE');
    });

    it('exercises every rule id the checker can construct', () => {
        const expected = new Set<string>([
            'A1_ALLOCATION_EXCEEDS_BUDGET', 'A3_NO_POLICY_FUNDED', 'A4_CAP_BINDS_IMMEDIATELY',
            'A5_STALE_COF_BASIS', 'A6_NO_UNLOCKED_CASH', 'A7_NEGATIVE_YEAR1_CASHFLOW',
            'A8_FUNDING_GAP', 'A9_ENDS_NEGATIVE', 'A9B_UNDERWATER_PERIOD', 'A10_NEVER_GROWS',
            'A11_STRESS_MARGIN_CALL', 'STRUCT_INVALID_ENUM',
        ]);
        const token = (f: string) => f.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
        for (const field of VALIDATED_FIELDS) expected.add(`B_${token(field)}_INVALID`);
        // Derived from which bounds the field actually declares, not from the field list. A field
        // with only a blockMax (budget and the other money-ceiling fields) can never emit an
        // _IMPLAUSIBLE id, and demanding coverage of an id the checker cannot construct made this
        // test report permanent phantom gaps.
        for (const [field, bounds] of Object.entries(PLAUSIBILITY_RANGES)) {
            const b = bounds as Record<string, number | undefined>;
            if (b.blockMin !== undefined || b.blockMax !== undefined) expected.add(`B_${token(field)}_OUT_OF_RANGE`);
            if (b.warnMin !== undefined || b.warnMax !== undefined) expected.add(`B_${token(field)}_IMPLAUSIBLE`);
        }

        // Reachable only by handing the checker a malformed output object, which this file
        // deliberately cannot do — every finding here comes from the real engine. Covered instead
        // by the synthetic-output unit tests in advisories.test.ts, cited per entry.
        const COVERED_ELSEWHERE: Record<string, string> = {
            STRUCT_INVALID_OUTPUT: 'advisories.test.ts — requires a non-finite engine output',
            A7_NEGATIVE_YEAR1_CASHFLOW: 'advisories.test.ts — needs a crafted monthlyNetCashflow',
            A8_FUNDING_GAP: 'advisories.test.ts — needs a crafted monthlyNetCashflow',
            A9_ENDS_NEGATIVE: 'advisories.test.ts:84 — needs a projection ending underwater',
            A10_NEVER_GROWS: 'advisories.test.ts:86 — needs a crafted flat projection',
        };
        const uncovered = [...expected].filter(id => !seen.has(id) && !(id in COVERED_ELSEWHERE));
        // The gate, not a log. Any rule id this probe stops reaching — because a rule went silent,
        // or because a new rule arrived with no scenario — fails here instead of being narrated
        // into a passing run.
        expect(uncovered, `rule ids no case exercises: ${uncovered.join(', ')}`).toEqual([]);
    });
});
