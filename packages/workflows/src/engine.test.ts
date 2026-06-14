import { describe, expect, it, vi } from 'vitest';

import type { ActionExecutor, WorkflowContext } from './dsl';
import {
  evaluateCondition,
  runWorkflowSteps,
  triggerMatches,
  type WorkflowStepInput,
} from './engine';

const baseCtx: WorkflowContext = {
  event: 'reply_received',
  orgId: 'org1',
  intent: 'interested',
  confidence: 0.9,
  contactTags: ['vip', 'lead'],
  contactEmail: 'a@b.com',
  campaignId: 'camp1',
};

describe('evaluateCondition', () => {
  it('eq / neq', () => {
    expect(evaluateCondition({ field: 'intent', op: 'eq', value: 'interested' }, baseCtx)).toBe(true);
    expect(evaluateCondition({ field: 'intent', op: 'neq', value: 'spam' }, baseCtx)).toBe(true);
    expect(evaluateCondition({ field: 'intent', op: 'eq', value: 'spam' }, baseCtx)).toBe(false);
  });

  it('gt / lt on numbers', () => {
    expect(evaluateCondition({ field: 'confidence', op: 'gt', value: 0.5 }, baseCtx)).toBe(true);
    expect(evaluateCondition({ field: 'confidence', op: 'lt', value: 0.5 }, baseCtx)).toBe(false);
    // non-numeric comparisons are false
    expect(evaluateCondition({ field: 'intent', op: 'gt', value: 1 }, baseCtx)).toBe(false);
  });

  it('contains on arrays and strings', () => {
    expect(evaluateCondition({ field: 'contactTags', op: 'contains', value: 'vip' }, baseCtx)).toBe(true);
    expect(evaluateCondition({ field: 'contactTags', op: 'contains', value: 'nope' }, baseCtx)).toBe(false);
    expect(evaluateCondition({ field: 'contactEmail', op: 'contains', value: '@b' }, baseCtx)).toBe(true);
  });

  it('in', () => {
    expect(evaluateCondition({ field: 'intent', op: 'in', value: ['interested', 'question'] }, baseCtx)).toBe(true);
    expect(evaluateCondition({ field: 'intent', op: 'in', value: ['spam'] }, baseCtx)).toBe(false);
  });
});

describe('triggerMatches', () => {
  it('matches event type', () => {
    expect(triggerMatches({ type: 'reply_received', params: {} }, baseCtx)).toBe(true);
    expect(triggerMatches({ type: 'link_clicked', params: {} }, baseCtx)).toBe(false);
  });
  it('honors intent + campaign filters', () => {
    expect(triggerMatches({ type: 'reply_received', params: { intent: 'interested' } }, baseCtx)).toBe(true);
    expect(triggerMatches({ type: 'reply_received', params: { intent: 'spam' } }, baseCtx)).toBe(false);
    expect(triggerMatches({ type: 'reply_received', params: { campaignId: 'other' } }, baseCtx)).toBe(false);
  });
});

describe('runWorkflowSteps', () => {
  const executor = (): ActionExecutor => ({ execute: vi.fn(async () => 'done') });

  it('runs actions when conditions pass', async () => {
    const exec = executor();
    const steps: WorkflowStepInput[] = [
      { type: 'condition', config: { field: 'intent', op: 'eq', value: 'interested' } },
      { type: 'action', config: { action: 'add_tag', params: { tag: 'hot' } } },
    ];
    const out = await runWorkflowSteps(steps, baseCtx, exec);
    expect(out.status).toBe('completed');
    expect(out.stoppedByCondition).toBe(false);
    expect(exec.execute).toHaveBeenCalledOnce();
  });

  it('stops at a failing condition and does not run later actions', async () => {
    const exec = executor();
    const steps: WorkflowStepInput[] = [
      { type: 'condition', config: { field: 'intent', op: 'eq', value: 'spam' } },
      { type: 'action', config: { action: 'add_tag', params: { tag: 'hot' } } },
    ];
    const out = await runWorkflowSteps(steps, baseCtx, exec);
    expect(out.stoppedByCondition).toBe(true);
    expect(exec.execute).not.toHaveBeenCalled();
  });

  it('marks failed when an action throws', async () => {
    const exec: ActionExecutor = {
      execute: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    const steps: WorkflowStepInput[] = [
      { type: 'action', config: { action: 'notify', params: {} } },
    ];
    const out = await runWorkflowSteps(steps, baseCtx, exec);
    expect(out.status).toBe('failed');
    expect(out.log.at(-1)?.level).toBe('error');
  });
});
