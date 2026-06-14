/**
 * Concrete workflow actions (the side-effecting half the engine delegates to).
 * Lives in the worker because it needs DB + email + queue access.
 */
import {
  AuditLog,
  Campaign,
  Contact,
  List,
  Message,
  Template,
  Thread,
} from '@mailflow/db';
import { generateMessageId } from '@mailflow/email';
import { enqueue } from '@mailflow/queue';
import { QUEUE_NAMES, renderMergeTags } from '@mailflow/shared';
import type { ActionConfig, ActionExecutor, WorkflowContext } from '@mailflow/workflows';

import { buildProvider, loadAccountWithSecrets } from './provider';

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

/** Send a template as a follow-up within the contact's thread. */
async function sendTemplate(params: Record<string, unknown>, ctx: WorkflowContext) {
  const templateId = str(params.templateId);
  if (!templateId) throw new Error('templateId is required');
  if (!ctx.contactId || !ctx.threadId) throw new Error('no contact/thread in context');

  const [template, contact, thread] = await Promise.all([
    Template.findOne({ _id: templateId, orgId: ctx.orgId }),
    Contact.findOne({ _id: ctx.contactId, orgId: ctx.orgId }),
    Thread.findOne({ _id: ctx.threadId, orgId: ctx.orgId }),
  ]);
  if (!template || !contact || !thread) throw new Error('template/contact/thread missing');

  const account = await loadAccountWithSecrets(thread.emailAccountId.toString());
  if (!account) throw new Error('thread mailbox not connected');

  const last = await Message.findOne({ orgId: ctx.orgId, threadId: thread._id })
    .sort({ createdAt: -1 })
    .lean();

  const cf =
    contact.customFields instanceof Map
      ? Object.fromEntries(contact.customFields)
      : ((contact.customFields as Record<string, string> | undefined) ?? {});
  const data = {
    firstName: contact.firstName ?? '',
    lastName: contact.lastName ?? '',
    email: contact.email,
    ...cf,
  };

  const subject = /^re:/i.test(thread.subject)
    ? thread.subject
    : `Re: ${renderMergeTags(template.subject, data)}`;
  const html = renderMergeTags(template.bodyHtml, data);
  const references = last ? [...last.references, last.messageId].filter(Boolean) : [];
  const messageId = generateMessageId(account.fromEmail);

  const provider = buildProvider(account);
  const result = await provider.send({
    to: contact.email,
    from: { email: account.fromEmail, name: account.fromName },
    subject,
    html,
    messageId,
    inReplyTo: last?.messageId,
    references,
  });

  const at = new Date();
  await Message.create({
    orgId: ctx.orgId,
    threadId: thread._id,
    emailAccountId: account._id,
    direction: 'out',
    messageId: result.messageId,
    inReplyTo: last?.messageId,
    references,
    from: account.fromEmail,
    to: [contact.email],
    subject,
    bodyHtml: html,
    sentAt: at,
  });
  await Thread.updateOne(
    { _id: thread._id },
    { $set: { lastMessageAt: at }, $inc: { messageCount: 1 } },
  );
  return `sent template "${template.name}" to ${contact.email}`;
}

async function changeList(params: Record<string, unknown>, ctx: WorkflowContext) {
  const listId = str(params.listId);
  if (!listId || !ctx.contactId) throw new Error('listId and contact required');
  await Contact.updateOne(
    { _id: ctx.contactId, orgId: ctx.orgId },
    { $addToSet: { listIds: listId } },
  );
  const count = await Contact.countDocuments({ orgId: ctx.orgId, listIds: listId });
  await List.updateOne({ _id: listId, orgId: ctx.orgId }, { $set: { contactCount: count } });
  return `added contact to list ${listId}`;
}

async function addTag(params: Record<string, unknown>, ctx: WorkflowContext) {
  const tag = str(params.tag).trim();
  if (!tag || !ctx.contactId) throw new Error('tag and contact required');
  await Contact.updateOne(
    { _id: ctx.contactId, orgId: ctx.orgId },
    { $addToSet: { tags: tag } },
  );
  return `tagged contact "${tag}"`;
}

async function notify(params: Record<string, unknown>, ctx: WorkflowContext) {
  const message = str(params.message) || `Workflow notification (${ctx.event})`;
  await AuditLog.create({
    orgId: ctx.orgId,
    action: 'workflow.notify',
    target: ctx.contactId ? { kind: 'Contact', id: ctx.contactId } : undefined,
    meta: { message, intent: ctx.intent },
    at: new Date(),
  });
  return `notified: ${message}`;
}

async function grantReward(params: Record<string, unknown>, ctx: WorkflowContext) {
  const rewardId = str(params.rewardId);
  if (!rewardId || !ctx.contactId) throw new Error('rewardId and contact required');
  await enqueue(QUEUE_NAMES.rewardGrant, {
    orgId: ctx.orgId,
    rewardId,
    contactId: ctx.contactId,
  });
  return `queued reward grant ${rewardId}`;
}

async function pauseCampaign(params: Record<string, unknown>, ctx: WorkflowContext) {
  const campaignId = str(params.campaignId) || ctx.campaignId;
  if (!campaignId) throw new Error('no campaign to pause');
  await Campaign.updateOne(
    { _id: campaignId, orgId: ctx.orgId, status: { $in: ['scheduled', 'running'] } },
    { $set: { status: 'paused' } },
  );
  return `paused campaign ${campaignId}`;
}

export function createActionExecutor(): ActionExecutor {
  return {
    async execute(action: ActionConfig, ctx: WorkflowContext): Promise<string> {
      switch (action.action) {
        case 'send_template':
          return sendTemplate(action.params, ctx);
        case 'change_list':
          return changeList(action.params, ctx);
        case 'add_tag':
          return addTag(action.params, ctx);
        case 'notify':
          return notify(action.params, ctx);
        case 'grant_reward':
          return grantReward(action.params, ctx);
        case 'pause_campaign':
          return pauseCampaign(action.params, ctx);
        default:
          throw new Error(`Unknown action: ${String(action.action)}`);
      }
    },
  };
}
