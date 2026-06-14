'use client';

import { useState } from 'react';
import { ChevronDown, Copy, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DnsRecord {
  kind: string;
  type: 'TXT' | 'CNAME';
  host: string;
  value: string;
  note: string;
}

function recordsFor(domain: string, appHost: string): DnsRecord[] {
  return [
    {
      kind: 'SPF',
      type: 'TXT',
      host: domain,
      value: 'v=spf1 include:_spf.google.com ~all',
      note: 'Authorizes your sending provider. Merge with any existing SPF record — keep only one SPF TXT.',
    },
    {
      kind: 'DKIM',
      type: 'TXT',
      host: `google._domainkey.${domain}`,
      value: 'v=DKIM1; k=rsa; p=<paste the public key from your provider>',
      note: 'Generate the key in your email provider (e.g. Google Admin → Authenticate email) and paste its value here.',
    },
    {
      kind: 'DMARC',
      type: 'TXT',
      host: `_dmarc.${domain}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; pct=100; adkim=s; aspf=s`,
      note: 'Start with p=quarantine, then tighten to p=reject once reports look clean.',
    },
    {
      kind: 'Tracking',
      type: 'CNAME',
      host: `mail.${domain}`,
      value: appHost,
      note: 'Optional: serve open/click tracking links from your own subdomain for better deliverability.',
    },
  ];
}

export function DnsGuidance({ domains, appHost }: { domains: string[]; appHost: string }) {
  const [openDomain, setOpenDomain] = useState<string | null>(domains[0] ?? null);

  if (domains.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="text-primary size-4" /> Deliverability (DNS)
        </CardTitle>
        <CardDescription>
          Add these records at your DNS provider so mailbox providers trust your domain.
          Values for Google Workspace shown — adjust the SPF include / DKIM key for other
          providers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {domains.map((domain) => {
          const open = openDomain === domain;
          return (
            <div key={domain} className="rounded-lg border">
              <button
                onClick={() => setOpenDomain(open ? null : domain)}
                className="hover:bg-accent/50 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left"
              >
                <span className="font-medium">{domain}</span>
                <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
              </button>
              {open && (
                <div className="space-y-3 border-t p-4">
                  {recordsFor(domain, appHost).map((r) => (
                    <div key={r.kind} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.kind}</span>
                        <Badge variant="outline">{r.type}</Badge>
                      </div>
                      <CopyRow label="Host" value={r.host} />
                      <CopyRow label="Value" value={r.value} mono />
                      <p className="text-muted-foreground text-xs">{r.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-muted/50 flex items-start gap-2 rounded-md border p-2">
      <span className="text-muted-foreground w-12 shrink-0 pt-0.5 text-xs">{label}</span>
      <code className={cn('flex-1 break-all text-xs', mono && 'font-mono')}>{value}</code>
      <Button
        size="icon"
        variant="ghost"
        className="size-6 shrink-0"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success('Copied');
        }}
      >
        <Copy className="size-3" />
      </Button>
    </div>
  );
}
