'use client';

import type * as React from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      closeButton
      style={
        {
          // ink bg / canvas text, 8px radius (per spec)
          '--normal-bg': 'rgb(var(--ink))',
          '--normal-text': 'rgb(var(--canvas))',
          '--normal-border': 'rgb(var(--ink))',
          '--border-radius': '8px',
          fontFamily: 'var(--font-sans)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
