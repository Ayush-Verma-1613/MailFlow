/** Strongly-typed job payloads, keyed by queue. */
import type { QueueName } from '@mailflow/shared';
import { QUEUE_NAMES } from '@mailflow/shared';

export interface CampaignFanoutJob {
  orgId: string;
  campaignId: string;
}

export interface SendEmailJob {
  orgId: string;
  campaignId: string;
  recipientId: string;
}

export interface InboundFetchJob {
  orgId: string;
  accountId: string;
  historyId?: string;
}

export interface InboundProcessJob {
  orgId: string;
  accountId: string;
  providerMessageId: string;
}

export interface AiAnalyzeJob {
  orgId: string;
  messageId: string;
}

export interface WorkflowRunJob {
  orgId: string;
  event: string;
  contextRef: { kind: string; id: string };
}

export interface RewardGrantJob {
  orgId: string;
  rewardId: string;
  contactId: string;
}

/** A job that exhausted its retries, captured for ops visibility. */
export interface DeadLetterJob {
  /** Queue the failed job came from. */
  queue: string;
  jobId?: string;
  name: string;
  data: unknown;
  failedReason?: string;
  attemptsMade: number;
}

/** Maps each queue to its job payload type. */
export interface JobMap {
  [QUEUE_NAMES.campaignFanout]: CampaignFanoutJob;
  [QUEUE_NAMES.sendEmail]: SendEmailJob;
  [QUEUE_NAMES.inboundFetch]: InboundFetchJob;
  [QUEUE_NAMES.inboundProcess]: InboundProcessJob;
  [QUEUE_NAMES.aiAnalyze]: AiAnalyzeJob;
  [QUEUE_NAMES.workflowRun]: WorkflowRunJob;
  [QUEUE_NAMES.rewardGrant]: RewardGrantJob;
  [QUEUE_NAMES.accountHealth]: Record<string, never>;
  [QUEUE_NAMES.deadLetter]: DeadLetterJob;
}

export type JobDataFor<Q extends QueueName> = Q extends keyof JobMap ? JobMap[Q] : unknown;
