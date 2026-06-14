'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/client-api';

export function ConnectGmailButton() {
  const [loading, setLoading] = useState(false);

  async function connect() {
    setLoading(true);
    try {
      const { url } = await apiRequest<{ url: string }>(
        '/api/email-accounts/connect/gmail',
        { method: 'POST' },
      );
      // Hand off to Google's consent screen.
      window.location.href = url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Google OAuth');
      setLoading(false);
    }
  }

  return (
    <Button onClick={connect} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
          />
        </svg>
      )}
      Connect Gmail
    </Button>
  );
}
