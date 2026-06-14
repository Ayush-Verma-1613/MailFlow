'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/client-api';

interface TestSendDialogProps {
  accountId: string;
  fromEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestSendDialog({
  accountId,
  fromEmail,
  open,
  onOpenChange,
}: TestSendDialogProps) {
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      await apiRequest(`/api/email-accounts/${accountId}/test`, {
        method: 'POST',
        body: JSON.stringify({ to }),
      });
      toast.success(`Test email sent to ${to}`);
      onOpenChange(false);
      setTo('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a test email</DialogTitle>
          <DialogDescription>
            Sends from <span className="font-medium">{fromEmail}</span> to verify
            delivery.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="test-to">Recipient</Label>
          <Input
            id="test-to"
            type="email"
            placeholder="you@example.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || !to}>
            {sending && <Loader2 className="size-4 animate-spin" />}
            Send test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
