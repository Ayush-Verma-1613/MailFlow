/**
 * Cross-cutting enums and constant values shared by web + worker.
 * Client-safe (no secrets, no node-only imports).
 */

// --- RBAC -------------------------------------------------------------------
export const ROLES = ['superadmin', 'admin', 'member', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

/** Higher number = more privilege. Used by requireRole / hasAtLeastRole. */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  superadmin: 3,
};

// --- Email providers --------------------------------------------------------
export const EMAIL_PROVIDERS = ['gmail', 'smtp', 'sendgrid', 'mailgun'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const ACCOUNT_HEALTH_STATUSES = [
  'connected',
  'degraded',
  'disconnected',
  'error',
] as const;
export type AccountHealthStatus = (typeof ACCOUNT_HEALTH_STATUSES)[number];

/** Default sending caps per provider (per connected account). */
export const DEFAULT_CAPS: Record<EmailProvider, { dailyCap: number; hourlyCap: number }> = {
  gmail: { dailyCap: 500, hourlyCap: 60 },
  smtp: { dailyCap: 1000, hourlyCap: 120 },
  sendgrid: { dailyCap: 5000, hourlyCap: 600 },
  mailgun: { dailyCap: 5000, hourlyCap: 600 },
};

// --- Contacts ---------------------------------------------------------------
export const CONTACT_STATUSES = [
  'active',
  'bounced',
  'unsubscribed',
  'complained',
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

// --- Campaigns --------------------------------------------------------------
export const CAMPAIGN_STATUSES = [
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ROTATION_STRATEGIES = ['round-robin', 'weighted', 'lru'] as const;
export type RotationStrategy = (typeof ROTATION_STRATEGIES)[number];

export const RECIPIENT_STATUSES = [
  'queued',
  'sending',
  'sent',
  'failed',
  'bounced',
] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export const RECIPIENT_EVENT_TYPES = [
  'open',
  'click',
  'bounce',
  'reply',
  'unsubscribe',
] as const;
export type RecipientEventType = (typeof RECIPIENT_EVENT_TYPES)[number];

// --- Messages / threads -----------------------------------------------------
export const MESSAGE_DIRECTIONS = ['in', 'out'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const THREAD_STATUSES = ['open', 'closed'] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

// --- AI intent --------------------------------------------------------------
export const AI_INTENTS = [
  'interested',
  'not_interested',
  'question',
  'unsubscribe',
  'out_of_office',
  'bounce',
  'spam',
  'other',
] as const;
export type AiIntent = (typeof AI_INTENTS)[number];

// --- Workflows --------------------------------------------------------------
export const WORKFLOW_TRIGGER_TYPES = [
  'reply_received',
  'no_reply_after',
  'link_clicked',
  'intent_detected',
  'manual',
] as const;
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPES)[number];

export const WORKFLOW_ACTION_TYPES = [
  'send_template',
  'change_list',
  'add_tag',
  'notify',
  'grant_reward',
  'pause_campaign',
] as const;
export type WorkflowActionType = (typeof WORKFLOW_ACTION_TYPES)[number];

export const WORKFLOW_RUN_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
] as const;
export type WorkflowRunStatus = (typeof WORKFLOW_RUN_STATUSES)[number];

// --- Queues (single source of truth, shared by web producers + worker) ------
export const QUEUE_NAMES = {
  sendEmail: 'send-email',
  campaignFanout: 'campaign-fanout',
  inboundFetch: 'inbound-fetch',
  inboundProcess: 'inbound-process',
  aiAnalyze: 'ai-analyze',
  workflowRun: 'workflow-run',
  rewardGrant: 'reward-grant',
  accountHealth: 'account-health',
  deadLetter: 'dead-letter',
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const QUEUE_CONCURRENCY: Record<QueueName, number> = {
  [QUEUE_NAMES.sendEmail]: 5, // further gated by per-account token bucket
  [QUEUE_NAMES.campaignFanout]: 5,
  [QUEUE_NAMES.inboundFetch]: 10,
  [QUEUE_NAMES.inboundProcess]: 20,
  [QUEUE_NAMES.aiAnalyze]: 10,
  [QUEUE_NAMES.workflowRun]: 20,
  [QUEUE_NAMES.rewardGrant]: 5,
  [QUEUE_NAMES.accountHealth]: 1,
  [QUEUE_NAMES.deadLetter]: 1,
};

// --- Retry / backoff defaults ----------------------------------------------
export const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 5_000 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

// --- AI model routing (OpenRouter model ids per task) -----------------------
export const AI_TASKS = ['intent', 'reply_draft', 'summary', 'embedding'] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const AI_MODEL_ROUTING: Record<AiTask, { primary: string; fallback?: string }> = {
  intent: { primary: 'anthropic/claude-haiku-4-5', fallback: 'openai/gpt-4o-mini' },
  reply_draft: { primary: 'anthropic/claude-sonnet-4-6', fallback: 'openai/gpt-4o' },
  summary: { primary: 'anthropic/claude-haiku-4-5', fallback: 'google/gemini-2.0-flash' },
  embedding: { primary: 'openai/text-embedding-3-small' },
};

// --- Misc -------------------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const CSV_IMPORT_MAX_ROWS = 100_000;
/** Max accepted CSV upload size (bytes). Bounds memory before the file is parsed. */
export const CSV_UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
export const TRACKING_PIXEL_PATH = '/api/webhooks/track/open';
export const TRACKING_CLICK_PATH = '/api/webhooks/track/click';
export const UNSUBSCRIBE_PATH = '/api/unsubscribe';
