import { DEFAULT_CLIENT_NAME as DEFAULT_INPUTS_CLIENT_NAME } from '../constants/defaults';
import type { Finding } from './advisories';
import type { SimulationInput, SimulationOutput } from './calculations';

export type StepKind = 'action' | 'ready';

export interface Step {
    id: string;
    kind: StepKind;
    targetView: string | null;
    field: string | null;
    messageKey: string;
    values: Record<string, number>;
}

export interface GuideContext {
    input: SimulationInput;
    output: SimulationOutput;
    advisories: Finding[];
    visitedViews: readonly string[];
    clientName: string;
    simulatedHibor: number;
    bondPriceDrop: number;
    hibor: number;
}

const action = (
    id: string, targetView: string | null, field: string | null,
    messageKey: string, values: Record<string, number> = {},
): Step => ({ id, kind: 'action', targetView, field, messageKey, values });

export const nextSteps = (ctx: GuideContext): Step[] => {
    const steps: Step[] = [];

    if (ctx.input.budget <= 0) {
        steps.push(action('G1_ZERO_BUDGET', 'allocation', 'budget', 'g1'));
    }

    if (ctx.input.budget > 0 && ctx.output.totalPremium <= 0) {
        steps.push(action('G2_NO_POLICY_FUNDED', 'allocation', 'bondAlloc', 'g2', {
            budget: ctx.input.budget,
            cashReserve: ctx.input.cashReserve,
            bondAlloc: ctx.input.bondAlloc,
        }));
    }

    const blockerCount = ctx.advisories.filter(
        finding => finding.severity === 'blocker' && finding.id !== 'A3_NO_POLICY_FUNDED'
    ).length;
    if (blockerCount > 0) {
        steps.push(action('G3_RESOLVE_BLOCKERS', null, null, 'g3', { count: blockerCount }));
    }

    const marketRiskVisited = ctx.visitedViews.includes('marketRisk');
    if (!marketRiskVisited) {
        steps.push(action('G4_STRESS_NOT_REVIEWED', 'marketRisk', null, 'g4'));
    }

    if (marketRiskVisited && Number.isFinite(ctx.simulatedHibor) && Number.isFinite(ctx.hibor)
        && ctx.simulatedHibor <= ctx.hibor && ctx.bondPriceDrop <= 0) {
        steps.push(action('G5_STRESS_NOT_ADVERSE', 'marketRisk', 'simulatedHibor', 'g5', {
            simulatedHibor: ctx.simulatedHibor,
            hibor: ctx.hibor,
        }));
    }

    if (marketRiskVisited && (!Number.isFinite(ctx.simulatedHibor) || !Number.isFinite(ctx.hibor))) {
        steps.push(action('G6_STRESS_INVALID', 'marketRisk', 'simulatedHibor', 'g6'));
    }

    if (ctx.clientName.trim() === '' || ctx.clientName.trim() === DEFAULT_INPUTS_CLIENT_NAME) {
        steps.push(action('G7_CLIENT_UNNAMED', 'pdfPreview', 'clientName', 'g7'));
    }

    if (steps.length === 0) {
        steps.push({ id: 'G8_READY', kind: 'ready', targetView: 'pdfPreview', field: null, messageKey: 'g8', values: {} });
    }

    return steps;
};
