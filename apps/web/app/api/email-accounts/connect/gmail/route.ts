import { buildConsentUrl } from '@mailflow/email';

import { ok, serverError } from '@/lib/api';
import { withOrg } from '@/lib/withOrg';
import { gmailOAuthConfig } from '@/lib/email-account';
import { issueOAuthState } from '@/lib/oauth-state';

/**
 * Begin the Gmail mailbox-connection OAuth flow. Returns the Google consent URL;
 * the client redirects the browser to it. A CSRF state cookie is set here and
 * verified in the callback.
 */
export const POST = withOrg(
  async () => {
    try {
      const config = gmailOAuthConfig();
      const state = await issueOAuthState();
      return ok({ url: buildConsentUrl(config, state) });
    } catch (error) {
      console.error('[connect/gmail] error:', error);
      return serverError('Google OAuth is not configured');
    }
  },
  { role: 'admin' },
);
