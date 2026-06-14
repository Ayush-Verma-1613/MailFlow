'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch — theme is only known on the client.
  React.useEffect(() => setMounted(true), []);

  const toggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {mounted && resolvedTheme === 'dark' ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </Button>
  );
}
