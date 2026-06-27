'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { signUpSchema, type SignUpInput } from '@mailflow/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignUpForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  async function onSubmit(values: SignUpInput) {
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? 'Could not create account');
        return;
      }

      // Email must be verified before sign-in — show the pending state.
      setSentTo(values.email);
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    if (!sentTo) return;
    await fetch('/api/auth/verify/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sentTo }),
    });
    toast.success('New code sent');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sentTo, code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error?.message ?? 'Invalid or expired code');
        return;
      }
      toast.success('Email verified — you can sign in now');
      router.push('/signin');
    } finally {
      setVerifying(false);
    }
  }

  if (sentTo) {
    return (
      <form onSubmit={verifyOtp} className="space-y-4 text-center">
        <h2 className="text-lg font-medium">Enter your code</h2>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to <strong>{sentTo}</strong> (or click the link in the same email).
          Enter the code to activate your account.
        </p>
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-lg tracking-[0.4em]"
        />
        <Button type="submit" className="w-full" disabled={verifying || code.length !== 6}>
          {verifying && <Loader2 className="size-4 animate-spin" />}
          Verify email
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={resend}>
          Resend code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          aria-invalid={Boolean(errors.name)}
          {...register('name')}
        />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="orgName">Workspace name (optional)</Label>
        <Input
          id="orgName"
          placeholder="Acme Outreach"
          aria-invalid={Boolean(errors.orgName)}
          {...register('orgName')}
        />
        {errors.orgName && <p className="text-destructive text-xs">{errors.orgName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={Boolean(errors.email)}
          {...register('email')}
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
