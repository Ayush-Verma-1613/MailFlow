import { z } from 'zod';
import {
  AI_INTENTS,
  WORKFLOW_ACTION_TYPES,
  WORKFLOW_TRIGGER_TYPES,
} from '../constants';
import { objectId } from './common';

// --- Trigger ----------------------------------------------------------------
export const workflowTriggerSchema = z.object({
  type: z.enum(WORKFLOW_TRIGGER_TYPES),
  params: z
    .object({
      /** For reply_received / intent_detected. */
      intent: z.enum(AI_INTENTS).optional(),
      /** For no_reply_after — days since last outbound message. */
      days: z.number().int().min(1).max(365).optional(),
      /** Scope the trigger to a campaign. */
      campaignId: objectId.optional(),
    })
    .default({}),
});
export type WorkflowTrigger = z.infer<typeof workflowTriggerSchema>;

// --- Steps (condition | action) ---------------------------------------------
const conditionStep = z.object({
  type: z.literal('condition'),
  config: z.object({
    field: z.string().min(1), // e.g. "intent", "contact.tag", "confidence"
    op: z.enum(['eq', 'neq', 'gt', 'lt', 'contains', 'in']),
    value: z.unknown(),
  }),
});

const actionStep = z.object({
  type: z.literal('action'),
  config: z.object({
    action: z.enum(WORKFLOW_ACTION_TYPES),
    /** Action-specific params, validated per action by the engine. */
    params: z.record(z.string(), z.unknown()).default({}),
  }),
});

export const workflowStepSchema = z.discriminatedUnion('type', [
  conditionStep,
  actionStep,
]);
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// --- Workflow ---------------------------------------------------------------
export const workflowCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  enabled: z.boolean().default(false),
  trigger: workflowTriggerSchema,
  steps: z.array(workflowStepSchema).max(50).default([]),
});
export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>;

export const workflowUpdateSchema = workflowCreateSchema.partial();
export type WorkflowUpdateInput = z.infer<typeof workflowUpdateSchema>;
