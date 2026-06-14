import type { AiIntent, WorkflowActionType } from '@mailflow/shared';

/**
 * Flat evaluation context passed to conditions + actions. Built by the worker
 * from the event's subject (a Message/Thread and its related docs).
 */
export interface WorkflowContext {
  event: string;
  orgId: string;
  intent?: AiIntent;
  confidence?: number;
  contactId?: string;
  contactEmail?: string;
  contactTags: string[];
  campaignId?: string;
  threadId?: string;
  messageId?: string;
}

export type ConditionOp = 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';

export interface ConditionConfig {
  field: string;
  op: ConditionOp;
  value: unknown;
}

export interface ActionConfig {
  action: WorkflowActionType;
  params: Record<string, unknown>;
}

/** A single executed-step log line surfaced in the WorkflowRun. */
export interface StepLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  stepIndex: number;
}

/**
 * Implemented by the worker (which has DB/email access). The engine itself
 * stays free of side-effect dependencies.
 */
export interface ActionExecutor {
  execute(action: ActionConfig, ctx: WorkflowContext): Promise<string>;
}
