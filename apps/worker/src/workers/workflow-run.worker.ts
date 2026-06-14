import type { Job } from 'bullmq';
import {
  CampaignRecipient,
  Contact,
  Message,
  Thread,
  Workflow,
  WorkflowRun,
  mongoose,
} from '@mailflow/db';
import {
  runWorkflowSteps,
  triggerMatches,
  type WorkflowContext,
  type WorkflowStepInput,
} from '@mailflow/workflows';
import type { WorkflowRunJob } from '@mailflow/queue';

import { logger } from '../logger';
import { createActionExecutor } from '../lib/workflow-actions';

/** Build the flat evaluation context from the event's subject document. */
async function buildContext(
  orgId: string,
  event: string,
  ref: { kind: string; id: string },
): Promise<WorkflowContext | null> {
  const ctx: WorkflowContext = { event, orgId, contactTags: [] };

  if (ref.kind === 'Message') {
    const msg = await Message.findOne({ _id: ref.id, orgId }).lean();
    if (!msg) return null;
    ctx.messageId = ref.id;
    ctx.threadId = msg.threadId.toString();
    ctx.intent = msg.ai?.intent;
    ctx.confidence = msg.ai?.confidence;
    const thread = await Thread.findById(msg.threadId).lean();
    ctx.campaignId = thread?.campaignId?.toString();
    const contactId = thread?.contactId?.toString();
    if (contactId) await attachContact(ctx, orgId, contactId);
  } else if (ref.kind === 'CampaignRecipient') {
    const r = await CampaignRecipient.findOne({ _id: ref.id, orgId }).lean();
    if (!r) return null;
    ctx.campaignId = r.campaignId.toString();
    ctx.threadId = r.threadId?.toString();
    await attachContact(ctx, orgId, r.contactId.toString());
  }

  return ctx;
}

async function attachContact(
  ctx: WorkflowContext,
  orgId: string,
  contactId: string,
): Promise<void> {
  ctx.contactId = contactId;
  const contact = await Contact.findOne({ _id: contactId, orgId })
    .select('email tags')
    .lean();
  ctx.contactEmail = contact?.email;
  ctx.contactTags = contact?.tags ?? [];
}

/**
 * Run every enabled workflow whose trigger matches this event, recording a
 * WorkflowRun (with a step log) for each.
 */
export async function processWorkflowRun(job: Job<WorkflowRunJob>): Promise<void> {
  const { orgId, event, contextRef } = job.data;
  const log = logger.child({ worker: 'workflow-run', event });

  const ctx = await buildContext(orgId, event, contextRef);
  if (!ctx) return;

  const workflows = await Workflow.find({
    orgId,
    enabled: true,
    'trigger.type': event,
  }).lean();

  const executor = createActionExecutor();

  for (const wf of workflows) {
    if (!triggerMatches(wf.trigger, ctx)) continue;

    const run = await WorkflowRun.create({
      workflowId: wf._id,
      orgId: new mongoose.Types.ObjectId(orgId),
      contextRef: { kind: contextRef.kind, id: new mongoose.Types.ObjectId(contextRef.id) },
      status: 'running',
      log: [],
      startedAt: new Date(),
    });

    const outcome = await runWorkflowSteps(
      wf.steps as unknown as WorkflowStepInput[],
      ctx,
      executor,
    );

    await WorkflowRun.updateOne(
      { _id: run._id },
      {
        $set: {
          status: outcome.status,
          finishedAt: new Date(),
          log: outcome.log.map((l) => ({
            at: new Date(),
            level: l.level,
            message: l.message,
            stepIndex: l.stepIndex,
          })),
        },
      },
    );
    log.info(
      { workflow: wf.name, status: outcome.status, stopped: outcome.stoppedByCondition },
      'workflow run finished',
    );
  }
}
