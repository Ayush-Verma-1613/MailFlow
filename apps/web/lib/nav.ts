import {
  BarChart3,
  FileText,
  Gift,
  GitBranch,
  Inbox,
  Mail,
  Send,
  Settings,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Two-group dashboard navigation (Workspace / Configure), in display order. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
      { label: 'Campaigns', href: '/dashboard/campaigns', icon: Send },
      { label: 'Contacts', href: '/dashboard/contacts', icon: UsersRound },
      { label: 'Templates', href: '/dashboard/templates', icon: FileText },
      { label: 'Workflows', href: '/dashboard/workflows', icon: GitBranch },
      { label: 'Rewards', href: '/dashboard/rewards', icon: Gift },
    ],
  },
  {
    label: 'Configure',
    items: [
      { label: 'Accounts', href: '/dashboard/accounts', icon: Mail },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

/** Flat list (used for breadcrumb/title lookup). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
