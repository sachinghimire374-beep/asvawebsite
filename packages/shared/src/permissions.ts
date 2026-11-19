/**
 * Permission keys are the unit of authorization. The API guard checks keys, never role names,
 * so adding a capability means: add a key here, map it to roles, run `npm run db:sync-permissions`.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  PAGES_MANAGE: 'pages.manage',
  SERVICES_MANAGE: 'services.manage',
  TECHNOLOGIES_MANAGE: 'technologies.manage',
  MEDIA_MANAGE: 'media.manage',
  TESTIMONIALS_MANAGE: 'testimonials.manage',
  FAQS_MANAGE: 'faqs.manage',
  TEAM_MANAGE: 'team.manage',
  NAVIGATION_MANAGE: 'navigation.manage',
  REDIRECTS_MANAGE: 'redirects.manage',

  INQUIRIES_READ: 'inquiries.read',
  INQUIRIES_UPDATE: 'inquiries.update',
  INQUIRIES_EXPORT: 'inquiries.export',
  INQUIRIES_DELETE: 'inquiries.delete',

  CONTACT_READ: 'contact.read',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_DELETE: 'contact.delete',

  NEWSLETTER_READ: 'newsletter.read',
  NEWSLETTER_MANAGE: 'newsletter.manage',
  NEWSLETTER_EXPORT: 'newsletter.export',

  JOBS_MANAGE: 'jobs.manage',
  APPLICATIONS_READ: 'applications.read',
  APPLICATIONS_UPDATE: 'applications.update',
  APPLICATIONS_RESUME: 'applications.resume',
  APPLICATIONS_DELETE: 'applications.delete',

  SETTINGS_MANAGE: 'settings.manage',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_READ: 'audit.read',
  EMAIL_READ: 'email.read',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, { group: string; description: string }> = {
  'dashboard.view': { group: 'Dashboard', description: 'View the admin dashboard overview' },
  'pages.manage': { group: 'Content', description: 'Create, edit, publish and delete pages' },
  'services.manage': { group: 'Content', description: 'Manage services' },
  'technologies.manage': { group: 'Content', description: 'Manage the technology stack' },
  'media.manage': { group: 'Content', description: 'Upload, edit and delete media library files' },
  'testimonials.manage': { group: 'Content', description: 'Manage and approve testimonials' },
  'faqs.manage': { group: 'Content', description: 'Manage FAQs and FAQ categories' },
  'team.manage': { group: 'Content', description: 'Manage team members shown on the About page' },
  'navigation.manage': { group: 'Content', description: 'Manage header and footer navigation' },
  'redirects.manage': { group: 'Content', description: 'Manage URL redirects' },
  'inquiries.read': { group: 'Business', description: 'View project inquiries (leads)' },
  'inquiries.update': { group: 'Business', description: 'Update lead status, assignment and notes' },
  'inquiries.export': { group: 'Business', description: 'Export leads to CSV' },
  'inquiries.delete': { group: 'Business', description: 'Permanently delete leads' },
  'contact.read': { group: 'Business', description: 'View contact submissions' },
  'contact.update': { group: 'Business', description: 'Mark read, archive and annotate contact submissions' },
  'contact.delete': { group: 'Business', description: 'Permanently delete contact submissions' },
  'newsletter.read': { group: 'Business', description: 'View newsletter subscribers' },
  'newsletter.manage': { group: 'Business', description: 'Unsubscribe or delete subscribers' },
  'newsletter.export': { group: 'Business', description: 'Export subscribers to CSV' },
  'jobs.manage': { group: 'Careers', description: 'Create, publish, close and archive vacancies' },
  'applications.read': { group: 'Careers', description: 'View job applications' },
  'applications.update': { group: 'Careers', description: 'Update application status and notes' },
  'applications.resume': { group: 'Careers', description: 'Download applicant resumes' },
  'applications.delete': { group: 'Careers', description: 'Permanently delete applications' },
  'settings.manage': { group: 'System', description: 'Change global website settings' },
  'users.manage': { group: 'System', description: 'Invite, edit and deactivate admin users' },
  'roles.manage': { group: 'System', description: 'Change role permissions' },
  'audit.read': { group: 'System', description: 'View audit logs' },
  'email.read': { group: 'System', description: 'View the email delivery log' },
};

export const ROLE_KEYS = ['ADMINISTRATOR', 'EDITOR', 'SALES_MANAGER', 'HR_MANAGER'] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

const P = PERMISSIONS;

export const DEFAULT_ROLES: Record<RoleKey, { name: string; description: string; permissions: PermissionKey[] }> = {
  ADMINISTRATOR: {
    name: 'Administrator',
    description: 'Full system access including users, roles and global settings.',
    permissions: ALL_PERMISSIONS,
  },
  EDITOR: {
    name: 'Editor',
    description: 'Manages website content: pages, services, media, FAQs and testimonials.',
    permissions: [
      P.DASHBOARD_VIEW,
      P.PAGES_MANAGE,
      P.SERVICES_MANAGE,
      P.TECHNOLOGIES_MANAGE,
      P.MEDIA_MANAGE,
      P.TESTIMONIALS_MANAGE,
      P.FAQS_MANAGE,
      P.TEAM_MANAGE,
      P.REDIRECTS_MANAGE,
    ],
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    description: 'Works leads and project inquiries, contact submissions and subscriber exports.',
    permissions: [
      P.DASHBOARD_VIEW,
      P.INQUIRIES_READ,
      P.INQUIRIES_UPDATE,
      P.INQUIRIES_EXPORT,
      P.CONTACT_READ,
      P.CONTACT_UPDATE,
      P.NEWSLETTER_READ,
      P.NEWSLETTER_EXPORT,
    ],
  },
  HR_MANAGER: {
    name: 'HR Manager',
    description: 'Manages vacancies and reviews job applications and resumes.',
    permissions: [
      P.DASHBOARD_VIEW,
      P.JOBS_MANAGE,
      P.APPLICATIONS_READ,
      P.APPLICATIONS_UPDATE,
      P.APPLICATIONS_RESUME,
    ],
  },
};

export function hasPermission(granted: readonly string[], required: PermissionKey | PermissionKey[]): boolean {
  const list = Array.isArray(required) ? required : [required];
  return list.every((key) => granted.includes(key));
}

export function hasAnyPermission(granted: readonly string[], options: PermissionKey[]): boolean {
  return options.some((key) => granted.includes(key));
}
