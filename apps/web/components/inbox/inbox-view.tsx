'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, GitBranch, Inbox, Loader2, Reply, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Paginated } from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/client-api';
import { cn } from '@/lib/utils';

const ALL = '__all__';

interface AccountOption {
  id: string;
  name: string;
  email: string;
  status: string;
}
interface ThreadListItem {
  id: string;
  subject: string;
  participants: string[];
  lastMessageAt: string;
  messageCount: number;
  aiIntent?: string;
  aiSummary?: string;
  status: string;
}
interface ThreadMessage {
  id: string;
  direction: 'in' | 'out';
  from: string;
  to?: string[];
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  snippet?: string;
  at: string;
  ai?: {
    intent?: string;
    confidence?: number;
    summary?: string;
    draftReply?: string;
    entities?: Record<string, unknown>;
  };
}
interface ThreadDetail {
  thread: {
    id: string;
    subject: string;
    aiIntent?: string;
    aiSummary?: string;
    campaignId?: string;
    contactId?: string;
    participants?: string[];
  };
  messages: ThreadMessage[];
}

const dotClass: Record<string, string> = {
  connected: 'bg-sage',
  degraded: 'bg-amber',
  disconnected: 'bg-muted-2',
  error: 'bg-rose',
};

function intentTone(intent?: string): 'sage' | 'amber' | 'rose' | 'default' {
  if (!intent) return 'default';
  if (['interested', 'question'].includes(intent)) return 'sage';
  if (['maybe_later', 'out_of_office'].includes(intent)) return 'amber';
  if (['unsubscribe', 'bounce', 'spam', 'not_interested'].includes(intent)) return 'rose';
  return 'default';
}
const badgeTone: Record<string, string> = {
  sage: 'bg-sage-soft text-sage',
  amber: 'bg-amber-soft text-amber',
  rose: 'bg-rose-soft text-rose',
  default: 'border border-hairline text-muted-foreground',
};

const savedViews: Array<{ label: string; intents: string[] }> = [
  { label: 'Hot leads', intents: ['interested'] },
  { label: 'Questions', intents: ['question'] },
  { label: 'Maybe later', intents: ['maybe_later'] },
  { label: 'Unsubscribes', intents: ['unsubscribe'] },
  { label: 'Bounces', intents: ['bounce'] },
];

function timeAgo(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
function initialsOf(s: string): string {
  return s.replace(/@.*/, '').slice(0, 2).toUpperCase();
}
function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function InboxView({ accounts }: { accounts: AccountOption[] }) {
  const [accountFilter, setAccountFilter] = useState(ALL);
  const [view, setView] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (accountFilter !== ALL) params.set('accountId', accountFilter);
      const data = await apiRequest<Paginated<ThreadListItem>>(`/api/threads?${params}`);
      setThreads(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load threads');
    } finally {
      setLoadingThreads(false);
    }
  }, [accountFilter]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const visibleThreads = useMemo(() => {
    if (!view) return threads;
    const intents = savedViews.find((v) => v.label === view)?.intents ?? [];
    return threads.filter((t) => t.aiIntent && intents.includes(t.aiIntent));
  }, [threads, view]);

  const openThread = useCallback(async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setReply('');
    setLoadingDetail(true);
    try {
      const data = await apiRequest<ThreadDetail>(`/api/threads/${id}`);
      setDetail(data);
      const draft = data.messages.find((m) => m.ai?.draftReply)?.ai?.draftReply;
      if (draft) setReply(stripHtml(draft) ?? '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load thread');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await apiRequest(`/api/threads/${selectedId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          bodyHtml: `<p>${escapeHtml(reply).replace(/\n/g, '<br/>')}</p>`,
        }),
      });
      toast.success('Reply sent');
      setReply('');
      await openThread(selectedId);
      loadThreads();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  const lastInbound = detail
    ? [...detail.messages].reverse().find((m) => m.direction === 'in')
    : undefined;
  const ai = lastInbound?.ai;

  async function regenerate() {
    if (!lastInbound || !selectedId) return;
    setRegenerating(true);
    try {
      await apiRequest(`/api/messages/${lastInbound.id}/ai-draft`, { method: 'POST' });
      toast.info('Regenerating AI suggestion…');
      setTimeout(() => void openThread(selectedId), 4000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate');
    } finally {
      setTimeout(() => setRegenerating(false), 4000);
    }
  }

  return (
    <div className="border-hairline -mx-8 -mt-7 -mb-16 flex h-[calc(100svh-56px)] overflow-hidden border-t">
      {/* Mailbox column */}
      <aside className="border-hairline hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r lg:flex">
        <div className="border-hairline border-b px-4 py-3.5">
          <div className="label-mono text-[10px]">Mailboxes</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-serif text-[22px] italic">All</span>
            {threads.length > 0 && (
              <span className="bg-clay ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium text-white">
                {threads.length} threads
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setAccountFilter(ALL)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-left',
            accountFilter === ALL ? 'bg-surface border-l-clay border-l-2' : 'border-l-2 border-l-transparent',
          )}
        >
          <span className="w-1.5" />
          <span className="mono text-[12px]">All inboxes</span>
        </button>
        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setAccountFilter(a.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-left',
              accountFilter === a.id
                ? 'bg-surface border-l-clay border-l-2'
                : 'border-l-2 border-l-transparent hover:bg-foreground/[0.02]',
            )}
          >
            <span className={cn('size-1.5 rounded-full', dotClass[a.status])} />
            <span className="mono text-ink-2 truncate text-[12px]">{a.name}</span>
          </button>
        ))}

        <div className="bg-hairline mx-4 my-3 h-px" />
        <div className="label-mono px-4 pb-2 text-[10px]">Saved views</div>
        {savedViews.map((v) => {
          const count = threads.filter((t) => t.aiIntent && v.intents.includes(t.aiIntent)).length;
          return (
            <button
              key={v.label}
              onClick={() => setView(view === v.label ? null : v.label)}
              className={cn(
                'flex items-center gap-2 px-4 py-1.5 text-left text-[12.5px]',
                view === v.label ? 'text-clay font-medium' : 'text-ink-2 hover:bg-foreground/[0.02]',
              )}
            >
              <span>{v.label}</span>
              <span className="mono text-muted-foreground ml-auto text-[10.5px]">{count}</span>
            </button>
          );
        })}
      </aside>

      {/* Thread list */}
      <div className="border-hairline flex w-[340px] shrink-0 flex-col overflow-hidden border-r max-md:w-full">
        <div className="border-hairline flex items-center gap-2.5 border-b px-4 py-3">
          <span className="font-serif text-[18px]">Replies</span>
          <span className="mono text-muted-foreground text-[11px]">
            · {visibleThreads.length}
            {view ? ` ${view}` : ''}
          </span>
          {view && (
            <button onClick={() => setView(null)} className="text-clay ml-auto text-[11px]">
              Clear
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="text-muted-foreground flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : visibleThreads.length === 0 ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <Inbox className="size-6" />
              <p className="text-sm">No conversations</p>
            </div>
          ) : (
            visibleThreads.map((t) => {
              const who = t.participants[0] ?? t.subject;
              const active = selectedId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => openThread(t.id)}
                  className={cn(
                    'border-hairline block w-full border-b px-4 py-3 text-left',
                    active
                      ? 'bg-clay/[0.06] border-l-clay border-l-2'
                      : 'border-l-2 border-l-transparent hover:bg-foreground/[0.015]',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="bg-clay grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-medium text-white">
                      {initialsOf(who)}
                    </span>
                    <span className="truncate text-[13.5px] font-medium">{who}</span>
                    <span className="mono text-muted-foreground ml-auto text-[10.5px]">
                      {timeAgo(t.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px]">{t.subject}</div>
                  {t.aiSummary && (
                    <div className="text-muted-foreground mt-0.5 truncate text-[12px]">
                      {t.aiSummary}
                    </div>
                  )}
                  {t.aiIntent && (
                    <div className="mt-1.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                          badgeTone[intentTone(t.aiIntent)],
                        )}
                      >
                        {t.aiIntent.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-w-0 flex-1 flex-col max-md:hidden">
        {!selectedId ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Select a conversation
          </div>
        ) : loadingDetail || !detail ? (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="border-hairline border-b px-6 py-4">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="font-serif text-[26px] tracking-[-0.01em]">
                  {detail.thread.subject}
                </span>
                {detail.thread.aiIntent && (
                  <span
                    className={cn(
                      'badge-dot inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                      badgeTone[intentTone(detail.thread.aiIntent)],
                    )}
                  >
                    {detail.thread.aiIntent.replace(/_/g, ' ')}
                  </span>
                )}
                {detail.thread.aiIntent === 'interested' && (
                  <span className="bg-clay-soft text-clay-ink badge-dot inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium">
                    Hot
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mono mt-1.5 flex flex-wrap gap-x-3 text-[11px] uppercase">
                <span>{detail.messages.length} msgs</span>
                <span>·</span>
                <span>{detail.thread.participants?.join(', ') ?? ''}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline">
                  <Reply /> Reply
                </Button>
                <Button size="sm" variant="outline">
                  <Check /> Mark done
                </Button>
                <Button size="sm" variant="ghost">
                  + Tag
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detail.messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'mb-3.5 rounded-[10px] border p-4',
                    m.direction === 'out' ? 'border-hairline bg-surface' : 'border-hairline bg-surface-2',
                  )}
                >
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="bg-clay grid size-[22px] place-items-center rounded-full text-[10px] font-medium text-white">
                      {initialsOf(m.from)}
                    </span>
                    <b>{m.direction === 'out' ? 'You' : m.from}</b>
                    <span className="mono text-muted-foreground ml-auto text-[11px]">
                      {timeAgo(m.at)}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13.5px] leading-[1.55] whitespace-pre-wrap break-words">
                    {m.bodyText ?? stripHtml(m.bodyHtml) ?? m.snippet ?? ''}
                  </p>
                </div>
              ))}

              {/* AI draft */}
              <div className="border-clay-soft bg-clay/[0.05] mt-3.5 rounded-[10px] border p-4">
                <div className="text-clay-ink flex items-center gap-2 text-[12px]">
                  <Sparkles className="size-4" strokeWidth={1.6} />
                  <b>Suggested reply</b>
                  {ai?.draftReply && (
                    <span className="text-muted-foreground ml-1">matches your voice</span>
                  )}
                  <span className="mono text-muted-foreground ml-auto text-[11px]">
                    claude-sonnet
                  </span>
                </div>
                <Textarea
                  rows={6}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  className="bg-surface mt-2.5 text-[13.5px]"
                />
                <div className="mt-2.5 flex items-center gap-1.5">
                  <Button size="sm" variant="clay" onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="animate-spin" /> : <Send />} Send
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    Schedule
                  </Button>
                  <Button size="sm" variant="outline" onClick={regenerate} disabled={regenerating || !lastInbound}>
                    {regenerating ? <Loader2 className="animate-spin" /> : <Sparkles />} Refine
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI analysis panel */}
      <aside className="border-hairline bg-surface hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l xl:flex">
        {!detail || !ai ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-[13px]">
            {detail ? 'No AI analysis yet for this thread.' : 'Select a conversation'}
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="label-mono text-[10px] tracking-[0.1em]">Reply analysis</div>
            <div className="font-serif mt-2 text-[22px] leading-[1.2] tracking-[-0.01em]">
              {ai.summary ?? detail.thread.aiSummary ?? 'Analyzing…'}
            </div>
            <div className="mt-3.5">
              <AnalysisRow label="Intent">
                {ai.intent && (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                      badgeTone[intentTone(ai.intent)],
                    )}
                  >
                    {ai.intent.replace(/_/g, ' ')}
                  </span>
                )}
              </AnalysisRow>
              {typeof ai.confidence === 'number' && (
                <AnalysisRow label="Confidence">
                  <span className="mono text-[12px]">{ai.confidence.toFixed(2)}</span>
                </AnalysisRow>
              )}
              {renderEntities(ai.entities)}
            </div>

            {/* Contact mini */}
            <div className="label-mono mt-4 text-[10px] tracking-[0.1em]">Contact</div>
            <div className="border-hairline bg-canvas mt-2 rounded-md border p-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-clay grid size-8 place-items-center rounded-full text-[12px] font-medium text-white">
                  {initialsOf(lastInbound?.from ?? '')}
                </span>
                <div className="min-w-0">
                  <div className="mono truncate text-[12.5px]">{lastInbound?.from}</div>
                  {detail.thread.campaignId && (
                    <div className="text-muted-foreground text-[11px]">From a campaign</div>
                  )}
                </div>
              </div>
            </div>

            {detail.thread.campaignId && (
              <>
                <div className="label-mono mt-4 text-[10px] tracking-[0.1em]">Source</div>
                <div className="border-hairline bg-canvas mt-2 flex items-center gap-2 rounded-md border p-3 text-[12px]">
                  <GitBranch className="size-3.5" strokeWidth={1.6} />
                  Linked to a campaign send
                </div>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function AnalysisRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-hairline flex items-baseline gap-2 border-b py-2">
      <span className="mono text-muted-foreground w-[88px] text-[10.5px] tracking-[0.06em] uppercase">
        {label}
      </span>
      <span className="flex-1 text-[13px]">{children}</span>
    </div>
  );
}

function renderEntities(entities?: Record<string, unknown>): React.ReactNode {
  if (!entities) return null;
  const rows: Array<[string, string]> = [];
  const company = entities.company;
  const role = entities.role;
  const meeting = entities.meetingRequest;
  if (typeof company === 'string' && company) rows.push(['Company', company]);
  if (typeof role === 'string' && role) rows.push(['Role', role]);
  if (typeof meeting === 'boolean') rows.push(['Meeting', meeting ? 'Requested' : 'No']);
  return rows.map(([k, v]) => (
    <AnalysisRow key={k} label={k}>
      <span className="text-[13px]">{v}</span>
    </AnalysisRow>
  ));
}
