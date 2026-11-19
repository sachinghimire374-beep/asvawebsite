import {
  BookOpen,
  Briefcase,
  ClipboardList,
  Cpu,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Mail,
  MailCheck,
  Menu,
  MessageSquareQuote,
  Route,
  ScrollText,
  Settings,
  Shapes,
  Tags,
  UserCircle,
  Users,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS, type PermissionKey } from '@asva/shared';

export interface NavEntry {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Any of these permissions shows the entry. */
  permissions: PermissionKey[];
}

export interface NavGroup {
  label: string;
  items: NavEntry[];
}

const P = PERMISSIONS;

/** Role-aware navigation: entries are hidden unless the user holds a matching permission. */
export const ADMIN_NAV: NavGroup[] = [
  { label: 'Dashboard', items: [{ label: 'Overview', href: '/admin', icon: LayoutDashboard, permissions: [P.DASHBOARD_VIEW] }] },
  {
    label: 'Content',
    items: [
      { label: 'Pages', href: '/admin/pages', icon: FileText, permissions: [P.PAGES_MANAGE] },
      { label: 'Services', href: '/admin/services', icon: Wrench, permissions: [P.SERVICES_MANAGE] },
      { label: 'Categories', href: '/admin/taxonomies', icon: Tags, permissions: [P.FAQS_MANAGE] },
      { label: 'Technologies', href: '/admin/technologies', icon: Cpu, permissions: [P.TECHNOLOGIES_MANAGE] },
      { label: 'FAQs', href: '/admin/faqs', icon: HelpCircle, permissions: [P.FAQS_MANAGE] },
      { label: 'Testimonials', href: '/admin/testimonials', icon: MessageSquareQuote, permissions: [P.TESTIMONIALS_MANAGE] },
      { label: 'Team', href: '/admin/team', icon: UsersRound, permissions: [P.TEAM_MANAGE] },
      { label: 'Media library', href: '/admin/media', icon: ImageIcon, permissions: [P.MEDIA_MANAGE] },
      { label: 'Navigation menus', href: '/admin/navigation', icon: Menu, permissions: [P.NAVIGATION_MANAGE] },
      { label: 'Redirects', href: '/admin/redirects', icon: Route, permissions: [P.REDIRECTS_MANAGE] },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Project inquiries', href: '/admin/inquiries', icon: Inbox, permissions: [P.INQUIRIES_READ] },
      { label: 'Contact submissions', href: '/admin/contact', icon: Mail, permissions: [P.CONTACT_READ] },
      { label: 'Newsletter', href: '/admin/newsletter', icon: MailCheck, permissions: [P.NEWSLETTER_READ] },
    ],
  },
  {
    label: 'Careers',
    items: [
      { label: 'Job listings', href: '/admin/jobs', icon: Briefcase, permissions: [P.JOBS_MANAGE] },
      { label: 'Applications', href: '/admin/applications', icon: ClipboardList, permissions: [P.APPLICATIONS_READ] },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, permissions: [P.USERS_MANAGE] },
      { label: 'Roles & permissions', href: '/admin/roles', icon: KeyRound, permissions: [P.USERS_MANAGE] },
      { label: 'Global settings', href: '/admin/settings', icon: Settings, permissions: [P.SETTINGS_MANAGE] },
      { label: 'Audit logs', href: '/admin/audit-logs', icon: ScrollText, permissions: [P.AUDIT_READ] },
      { label: 'Email log', href: '/admin/email-log', icon: BookOpen, permissions: [P.EMAIL_READ] },
    ],
  },
  { label: 'Account', items: [{ label: 'My profile', href: '/admin/profile', icon: UserCircle, permissions: [] }] },
];

export const SECTION_ICONS = { Shapes };
