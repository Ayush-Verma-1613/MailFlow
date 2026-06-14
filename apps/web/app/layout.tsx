import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

// Geist (UI) · Geist Mono (data/IDs/timestamps) · Instrument Serif (display + italic accents)
const sans = Geist({ subsets: ['latin'], variable: '--font-geist' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument',
});

export const metadata: Metadata = {
  title: {
    default: 'MailFlow — AI Email Outreach',
    template: '%s · MailFlow',
  },
  description:
    'AI-powered, multi-account email outreach & automation. Connect mailboxes, launch campaigns, classify replies with AI, and automate follow-ups.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${serif.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
