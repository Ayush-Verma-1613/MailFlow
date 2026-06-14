/**
 * Read-only analytics aggregations. All pipelines are org-scoped.
 */
import 'server-only';
import {
  Campaign,
  CampaignRecipient,
  Contact,
  EmailAccount,
  Thread,
  mongoose,
} from '@mailflow/db';

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export interface FunnelStats {
  queued: number;
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  replied: number;
  unsubscribed: number;
}

const EMPTY_FUNNEL: FunnelStats = {
  queued: 0,
  sent: 0,
  delivered: 0,
  bounced: 0,
  opened: 0,
  clicked: 0,
  replied: 0,
  unsubscribed: 0,
};

export interface OverviewAnalytics {
  funnel: FunnelStats;
  rates: { openRate: number; clickRate: number; replyRate: number; bounceRate: number };
  campaignsByStatus: Record<string, number>;
  contactsByStatus: Record<string, number>;
  intentBreakdown: Array<{ intent: string; count: number }>;
  totals: { campaigns: number; contacts: number; accounts: number };
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export async function getOverview(orgId: string): Promise<OverviewAnalytics> {
  const org = oid(orgId);

  const [funnelAgg, campaignStatus, contactStatus, intentAgg, accounts] = await Promise.all([
    Campaign.aggregate<{ _id: null } & FunnelStats>([
      { $match: { orgId: org } },
      {
        $group: {
          _id: null,
          queued: { $sum: '$stats.queued' },
          sent: { $sum: '$stats.sent' },
          delivered: { $sum: '$stats.delivered' },
          bounced: { $sum: '$stats.bounced' },
          opened: { $sum: '$stats.opened' },
          clicked: { $sum: '$stats.clicked' },
          replied: { $sum: '$stats.replied' },
          unsubscribed: { $sum: '$stats.unsubscribed' },
        },
      },
    ]),
    Campaign.aggregate<{ _id: string; count: number }>([
      { $match: { orgId: org } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Contact.aggregate<{ _id: string; count: number }>([
      { $match: { orgId: org } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Thread.aggregate<{ _id: string; count: number }>([
      { $match: { orgId: org, aiIntent: { $exists: true, $ne: null } } },
      { $group: { _id: '$aiIntent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    EmailAccount.countDocuments({ orgId: org }),
  ]);

  const funnel = { ...EMPTY_FUNNEL, ...(funnelAgg[0] ?? {}) };
  delete (funnel as Record<string, unknown>)._id;

  const campaignsByStatus = Object.fromEntries(campaignStatus.map((c) => [c._id, c.count]));
  const contactsByStatus = Object.fromEntries(contactStatus.map((c) => [c._id, c.count]));

  return {
    funnel,
    rates: {
      openRate: rate(funnel.opened, funnel.sent),
      clickRate: rate(funnel.clicked, funnel.sent),
      replyRate: rate(funnel.replied, funnel.sent),
      bounceRate: rate(funnel.bounced, funnel.sent),
    },
    campaignsByStatus,
    contactsByStatus,
    intentBreakdown: intentAgg.map((i) => ({ intent: i._id, count: i.count })),
    totals: {
      campaigns: Object.values(campaignsByStatus).reduce((s, n) => s + n, 0),
      contacts: Object.values(contactsByStatus).reduce((s, n) => s + n, 0),
      accounts,
    },
  };
}

export interface AccountAnalytics {
  id: string;
  displayName: string;
  fromEmail: string;
  provider: string;
  status: string;
  sentToday: number;
  dailyCap: number;
  totalSent: number;
}

export async function getAccountAnalytics(orgId: string): Promise<AccountAnalytics[]> {
  const org = oid(orgId);
  const [accounts, sentByAccount] = await Promise.all([
    EmailAccount.find({ orgId: org }).lean(),
    CampaignRecipient.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { orgId: org, status: 'sent', emailAccountId: { $ne: null } } },
      { $group: { _id: '$emailAccountId', count: { $sum: 1 } } },
    ]),
  ]);

  const totalById = new Map(sentByAccount.map((s) => [s._id?.toString(), s.count]));

  return accounts.map((a) => ({
    id: a._id.toString(),
    displayName: a.displayName,
    fromEmail: a.fromEmail,
    provider: a.provider,
    status: a.health.status,
    sentToday: a.health.sentToday,
    dailyCap: a.limits.dailyCap,
    totalSent: totalById.get(a._id.toString()) ?? 0,
  }));
}

export interface CampaignAnalytics {
  funnel: FunnelStats;
  recipientsByStatus: Record<string, number>;
}

export async function getCampaignAnalytics(
  orgId: string,
  campaignId: string,
): Promise<CampaignAnalytics | null> {
  const campaign = await Campaign.findOne({ _id: campaignId, orgId }).select('stats').lean();
  if (!campaign) return null;

  const byStatus = await CampaignRecipient.aggregate<{ _id: string; count: number }>([
    { $match: { campaignId: oid(campaignId), orgId: oid(orgId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return {
    funnel: { ...EMPTY_FUNNEL, ...campaign.stats },
    recipientsByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
  };
}
