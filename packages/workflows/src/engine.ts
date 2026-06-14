import type {
  ActionConfig,
  ActionExecutor,
  ConditionConfig,
  StepLog,
  WorkflowContext,
} from './dsl';

/** Resolve a possibly-dotted field path from the context. */
function resolveField(ctx: WorkflowContext, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      ctx,
    );
}

/** Evaluate one condition against the context. */
export function evaluateCondition(cond: ConditionConfig, ctx: WorkflowContext): boolean {
  const actual = resolveField(ctx, cond.field);
  const expected = cond.value;

  switch (cond.op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(expected);
      if (typeof actual === 'string') return actual.includes(String(expected));
      return false;
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    default:
      return false;
  }
}

export type WorkflowStepInput =
  | { type: 'condition'; config: ConditionConfig }
  | { type: 'action'; config: ActionConfig };

export interface RunOutcome {
  status: 'completed' | 'failed';
  /** True when a condition gate stopped execution early. */
  stoppedByCondition: boolean;
  log: StepLog[];
}

/**
 * Execute workflow steps in order. A failing condition halts the run (the
 * conventional "guard" semantics); actions are dispatched to the executor.
 */
export async function runWorkflowSteps(
  steps: WorkflowStepInput[],
  ctx: WorkflowContext,
  executor: ActionExecutor,
): Promise<RunOutcome> {
  const log: StepLog[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (!step) continue;

    if (step.type === 'condition') {
      const passed = evaluateCondition(step.config, ctx);
      log.push({
        level: 'info',
        stepIndex: i,
        message: `Condition ${step.config.field} ${step.config.op} ${JSON.stringify(
          step.config.value,
        )} → ${passed ? 'pass' : 'fail'}`,
      });
      if (!passed) {
        return { status: 'completed', stoppedByCondition: true, log };
      }
      continue;
    }

    try {
      const result = await executor.execute(step.config, ctx);
      log.push({ level: 'info', stepIndex: i, message: `Action ${step.config.action}: ${result}` });
    } catch (error) {
      log.push({
        level: 'error',
        stepIndex: i,
        message: `Action ${step.config.action} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      return { status: 'failed', stoppedByCondition: false, log };
    }
  }

  return { status: 'completed', stoppedByCondition: false, log };
}

/** Does a workflow's trigger match the incoming event + context? */
export function triggerMatches(
  trigger: { type: string; params: Record<string, unknown> },
  ctx: WorkflowContext,
): boolean {
  if (trigger.type !== ctx.event) return false;

  // Optional intent filter (reply_received / intent_detected).
  if (trigger.params.intent && trigger.params.intent !== ctx.intent) return false;
  // Optional campaign scoping.
  if (trigger.params.campaignId && trigger.params.campaignId !== ctx.campaignId) {
    return false;
  }
  return true;
}
