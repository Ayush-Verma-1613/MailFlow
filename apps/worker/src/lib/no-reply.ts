/**
 * Scan for the `no_reply_after` workflow trigger: contacts who were sent a
 * campaign email N days ago and never replied. Emits a workflow-run event per
 * matching recipient, deduped by an existing WorkflowRun.
 */
import { CampaignRecipient, Workflow, WorkflowRun, mongoose } from '@mailflow/db';
import { enqueue } from '@mailflow/queue';
import { QUEUE_NAMES } from '@mailflow/shared';
import type { FilterQuery } from 'mongoose';

import { logger } from '../logger';

const MAX_PER_WORKFLOW = 500;

export async function runNoReplyScan(): Promise<number> {
  const workflows = await Workflow.find({
    enabled: true,
    'trigger.type': 'no_reply_after',
  }).lean();

  let fired = 0;

  for (const wf of workflows) {
    const days = Number((wf.trigger.params as { days?: number })?.days ?? 0);
    if (!days || days < 1) continue;
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const match: FilterQuery<Record<string, unknown>> = {
      orgId: wf.orgId,
      status: 'sent',
      sentAt: { $lte: cutoff },
      'events.type': { $ne: 'reply' }, // no reply event recorded
    };
    const campaignId = (wf.trigger.params as { campaignId?: string })?.campaignId;
    if (campaignId) match.campaignId = new mongoose.Types.ObjectId(campaignId);

    const recipients = await CampaignRecipient.find(match)
      .select('_id')
      .limit(MAX_PER_WORKFLOW)
      .lean();

    for (const r of recipients) {
      // Fire once per (workflow, recipient).
      const exists = await WorkflowRun.exists({ workflowId: wf._id, 'contextRef.id': r._id });
      if (exists) continue;

      await enqueue(
        QUEUE_NAMES.workflowRun,
        {
          orgId: wf.orgId.toString(),
          event: 'no_reply_after',
          contextRef: { kind: 'CampaignRecipient', id: r._id.toString() },
        },
        { jobId: `noreply-${wf._id.toString()}-${r._id.toString()}` },
      );
      fired++;
    }
  }

  if (fired > 0) logger.info({ fired }, 'no_reply_after events emitted');
  return fired;
}
