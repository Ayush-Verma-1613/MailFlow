'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { smtpConnectSchema, type SmtpConnectInput } from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/client-api';

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

export function SmtpDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SmtpConnectInput>({
    resolver: zodResolver(smtpConnectSchema),
    defaultValues: { port: 587, secure: false },
  });

  async function onSubmit(values: SmtpConnectInput) {
    try {
      await apiRequest('/api/email-accounts/smtp', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('SMTP mailbox connected');
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add SMTP</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect an SMTP mailbox</DialogTitle>
          <DialogDescription>
            We verify the connection before saving. The password is encrypted at rest.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field id="displayName" label="Display name" error={errors.displayName?.message}>
              <Input id="displayName" placeholder="Sales mailbox" {...register('displayName')} />
            </Field>
            <Field id="fromName" label="From name" error={errors.fromName?.message}>
              <Input id="fromName" placeholder="Ada Lovelace" {...register('fromName')} />
            </Field>
          </div>

          <Field id="fromEmail" label="From email" error={errors.fromEmail?.message}>
            <Input
              id="fromEmail"
              type="email"
              placeholder="ada@company.com"
              {...register('fromEmail')}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field id="host" label="SMTP host" error={errors.host?.message}>
                <Input id="host" placeholder="smtp.company.com" {...register('host')} />
              </Field>
            </div>
            <Field id="port" label="Port" error={errors.port?.message}>
              <Input id="port" type="number" {...register('port')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="user" label="Username" error={errors.user?.message}>
              <Input id="user" autoComplete="off" {...register('user')} />
            </Field>
            <Field id="pass" label="Password" error={errors.pass?.message}>
              <Input id="pass" type="password" autoComplete="new-password" {...register('pass')} />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" {...register('secure')} />
            Use TLS (port 465)
          </label>

          <details className="rounded-md border border-border/60 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">
              DKIM signing (optional)
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-muted-foreground text-xs">
                Sign outbound mail with DKIM to improve deliverability. Publish the matching public
                key in DNS at <code>&lt;selector&gt;._domainkey.{'{your domain}'}</code> before
                sending.
              </p>
              <Field id="dkimSelector" label="Selector" error={errors.dkimSelector?.message}>
                <Input
                  id="dkimSelector"
                  placeholder="mailflow"
                  {...register('dkimSelector', {
                    setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
                  })}
                />
              </Field>
              <Field
                id="dkimPrivateKey"
                label="Private key (PEM)"
                error={errors.dkimPrivateKey?.message}
              >
                <Textarea
                  id="dkimPrivateKey"
                  rows={4}
                  spellCheck={false}
                  placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                  {...register('dkimPrivateKey', {
                    setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
                  })}
                />
              </Field>
            </div>
          </details>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Verify &amp; connect
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
