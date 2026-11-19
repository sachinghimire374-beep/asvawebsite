'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Tabs } from 'radix-ui';
import {
  faqCategoryInputSchema,
  faqInputSchema,
  LABELS,
  NAVIGATION_MENU_KEYS,
  navigationItemInputSchema,
  PERMISSIONS,
  redirectInputSchema,
  TECHNOLOGY_CATEGORIES,
  technologyInputSchema,
  TESTIMONIAL_STATUSES,
  teamMemberInputSchema,
  testimonialInputSchema,
} from '@asva/shared';
import { Badge } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { useAuth } from './auth';
import { DialogCrud } from './resource';
import { PageHeader, StatusBadge } from './ui';

const yesNo = (v: boolean, yes = 'Visible', no = 'Hidden') => <Badge variant={v ? 'success' : 'secondary'}>{v ? yes : no}</Badge>;
const nullable = (r: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));

export function TechnologiesPage() {
  return (
    <DialogCrud<any>
      title="Technologies"
      description="Only make visible the technologies the team genuinely uses."
      singular="Technology"
      permission={PERMISSIONS.TECHNOLOGIES_MANAGE}
      endpoint="/admin/technologies"
      reorderable
      pageSize={100}
      labelOf={(r) => r.name}
      filters={[{ name: 'category', label: 'Category', options: [{ value: '', label: 'All categories' }, ...TECHNOLOGY_CATEGORIES.map((c) => ({ value: c, label: LABELS.technologyCategory[c] }))] }]}
      schema={technologyInputSchema}
      defaults={{ name: '', slug: '', category: 'FRONTEND', logoId: null, websiteUrl: '', displayOrder: 0, isVisible: true }}
      toForm={(r) => ({ ...r, logoId: r.logo?.id ?? null, websiteUrl: r.websiteUrl ?? '' })}
      columns={[
        { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'category', header: 'Category', cell: (r) => LABELS.technologyCategory[r.category as keyof typeof LABELS.technologyCategory] },
        { key: 'visible', header: 'Website', cell: (r) => yesNo(r.isVisible) },
        { key: 'usage', header: 'Used in', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r._count?.services ?? 0} services</span> },
      ]}
      fields={[
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'slug', name: 'slug', label: 'Slug', from: 'name' },
        { type: 'select', name: 'category', label: 'Category', options: TECHNOLOGY_CATEGORIES.map((c) => ({ value: c, label: LABELS.technologyCategory[c] })) },
        { type: 'url', name: 'websiteUrl', label: 'Website' },
        { type: 'number', name: 'displayOrder', label: 'Display order' },
        { type: 'switch', name: 'isVisible', label: 'Show on website' },
        { type: 'media', name: 'logoId', label: 'Logo' },
      ]}
    />
  );
}

export function FaqsPage() {
  return (
    <DialogCrud<any>
      title="FAQs"
      description="Questions shown on the FAQ page, grouped by category."
      singular="FAQ"
      permission={PERMISSIONS.FAQS_MANAGE}
      endpoint="/admin/faqs"
      reorderable
      pageSize={100}
      labelOf={(r) => r.question}
      schema={faqInputSchema}
      defaults={{ question: '', answer: '', categoryId: null, isPublished: false, displayOrder: 0 }}
      toForm={(r) => ({ ...r, categoryId: r.category?.id ?? null })}
      columns={[
        { key: 'q', header: 'Question', cell: (r) => <span className="font-medium">{r.question}</span> },
        { key: 'cat', header: 'Category', hideOnMobile: true, cell: (r) => r.category?.name ?? <span className="text-muted-foreground">General</span> },
        { key: 'pub', header: 'Status', cell: (r) => yesNo(r.isPublished, 'Published', 'Draft') },
      ]}
      fields={[
        { type: 'text', name: 'question', label: 'Question', required: true, span: 2 },
        { type: 'rich', name: 'answer', label: 'Answer' },
        { type: 'select', name: 'categoryId', label: 'Category', options: { endpoint: '/admin/faq-categories', labelKey: 'name' }, allowEmpty: 'General' },
        { type: 'number', name: 'displayOrder', label: 'Display order' },
        { type: 'switch', name: 'isPublished', label: 'Published', span: 2 },
      ]}
    />
  );
}

export function TestimonialsPage() {
  return (
    <DialogCrud<any>
      title="Testimonials"
      description="Only publish genuine testimonials with the client’s permission. Approval requires confirming that permission."
      singular="Testimonial"
      permission={PERMISSIONS.TESTIMONIALS_MANAGE}
      endpoint="/admin/testimonials"
      reorderable
      labelOf={(r) => r.clientName}
      filters={[{ name: 'status', label: 'Status', options: [{ value: '', label: 'All statuses' }, ...TESTIMONIAL_STATUSES.map((s) => ({ value: s, label: LABELS.testimonialStatus[s] }))] }]}
      schema={testimonialInputSchema}
      defaults={{ clientName: '', designation: '', company: '', content: '', avatarId: null, rating: null, status: 'PENDING', permissionConfirmed: false, isFeatured: false, displayOrder: 0 }}
      toForm={(r) => ({ ...r, avatarId: r.avatar?.id ?? null, ...nullable(r, ['designation', 'company', 'rating']) })}
      columns={[
        { key: 'name', header: 'Client', cell: (r) => (<div><p className="font-medium">{r.clientName}</p><p className="text-xs text-muted-foreground">{[r.designation, r.company].filter(Boolean).join(', ')}</p></div>) },
        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
        { key: 'featured', header: '', hideOnMobile: true, cell: (r) => r.isFeatured && <Badge variant="info">Featured</Badge> },
      ]}
      fields={[
        { type: 'text', name: 'clientName', label: 'Client name', required: true },
        { type: 'text', name: 'designation', label: 'Designation' },
        { type: 'text', name: 'company', label: 'Company' },
        { type: 'select', name: 'rating', label: 'Rating', options: [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} / 5` })), allowEmpty: 'No rating' },
        { type: 'textarea', name: 'content', label: 'Testimonial', required: true, rows: 4 },
        { type: 'select', name: 'status', label: 'Approval status', options: TESTIMONIAL_STATUSES.map((s) => ({ value: s, label: LABELS.testimonialStatus[s] })) },
        { type: 'number', name: 'displayOrder', label: 'Display order' },
        { type: 'switch', name: 'permissionConfirmed', label: 'Client permission confirmed', hint: 'Required before approval' },
        { type: 'switch', name: 'isFeatured', label: 'Feature on homepage' },
        { type: 'media', name: 'avatarId', label: 'Photo' },
      ]}
    />
  );
}

export function TeamPage() {
  return (
    <DialogCrud<any>
      title="Team"
      description="Team members shown on the About page."
      singular="Team member"
      permission={PERMISSIONS.TEAM_MANAGE}
      endpoint="/admin/team"
      reorderable
      labelOf={(r) => r.name}
      schema={teamMemberInputSchema}
      defaults={{ name: '', role: '', bio: '', photoId: null, linkedinUrl: '', isVisible: true, displayOrder: 0 }}
      toForm={(r) => ({ ...r, photoId: r.photo?.id ?? null, ...nullable(r, ['bio', 'linkedinUrl']) })}
      columns={[
        { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'role', header: 'Role', cell: (r) => r.role },
        { key: 'visible', header: 'Website', cell: (r) => yesNo(r.isVisible) },
      ]}
      fields={[
        { type: 'text', name: 'name', label: 'Name', required: true },
        { type: 'text', name: 'role', label: 'Role', required: true },
        { type: 'textarea', name: 'bio', label: 'Short bio', rows: 3 },
        { type: 'url', name: 'linkedinUrl', label: 'LinkedIn URL' },
        { type: 'number', name: 'displayOrder', label: 'Display order' },
        { type: 'switch', name: 'isVisible', label: 'Show on website' },
        { type: 'media', name: 'photoId', label: 'Photo' },
      ]}
    />
  );
}

export function NavigationPage() {
  return (
    <DialogCrud<any>
      title="Navigation menus"
      description="Header and footer links. Links must be site paths (/about) or full https:// URLs."
      singular="Menu item"
      permission={PERMISSIONS.NAVIGATION_MANAGE}
      endpoint="/admin/navigation"
      reorderable
      pageSize={100}
      labelOf={(r) => r.label}
      filters={[{ name: 'menu', label: 'Menu', options: NAVIGATION_MENU_KEYS.map((k) => ({ value: k, label: LABELS.navigationMenu[k] })) }]}
      schema={navigationItemInputSchema}
      defaults={{ menu: 'HEADER', label: '', href: '/', openInNewTab: false, isVisible: true, displayOrder: 0 }}
      columns={[
        { key: 'label', header: 'Label', cell: (r) => <span className="font-medium">{r.label}</span> },
        { key: 'href', header: 'Link', cell: (r) => <code className="text-xs">{r.href}</code> },
        { key: 'visible', header: 'Status', cell: (r) => yesNo(r.isVisible) },
      ]}
      fields={[
        { type: 'select', name: 'menu', label: 'Menu', options: NAVIGATION_MENU_KEYS.map((k) => ({ value: k, label: LABELS.navigationMenu[k] })) },
        { type: 'text', name: 'label', label: 'Label', required: true },
        { type: 'text', name: 'href', label: 'Link', required: true, hint: '/path, https://…, mailto: or tel:' },
        { type: 'number', name: 'displayOrder', label: 'Display order' },
        { type: 'switch', name: 'openInNewTab', label: 'Open in new tab' },
        { type: 'switch', name: 'isVisible', label: 'Visible' },
      ]}
    />
  );
}

export function RedirectsPage() {
  return (
    <DialogCrud<any>
      title="Redirects"
      description="Old URLs are redirected automatically when you change a published slug. Add others here."
      singular="Redirect"
      permission={PERMISSIONS.REDIRECTS_MANAGE}
      endpoint="/admin/redirects"
      labelOf={(r) => r.fromPath}
      schema={redirectInputSchema}
      defaults={{ fromPath: '/', toPath: '/', statusCode: 308, isActive: true }}
      toForm={(r) => ({ ...r, statusCode: String(r.statusCode) })}
      columns={[
        { key: 'from', header: 'From', cell: (r) => <code className="text-xs">{r.fromPath}</code> },
        { key: 'to', header: 'To', cell: (r) => <code className="text-xs">{r.toPath}</code> },
        { key: 'code', header: 'Type', hideOnMobile: true, cell: (r) => r.statusCode },
        { key: 'hits', header: 'Hits', hideOnMobile: true, cell: (r) => <span className="tabular-nums">{r.hits}</span> },
        { key: 'active', header: 'Status', cell: (r) => yesNo(r.isActive, 'Active', 'Disabled') },
      ]}
      fields={[
        { type: 'text', name: 'fromPath', label: 'From path', required: true, hint: 'e.g. /old-page' },
        { type: 'text', name: 'toPath', label: 'To', required: true, hint: '/new-page or https://…' },
        { type: 'select', name: 'statusCode', label: 'Type', options: [{ value: '308', label: '308 Permanent' }, { value: '301', label: '301 Permanent (legacy)' }, { value: '307', label: '307 Temporary' }, { value: '302', label: '302 Temporary (legacy)' }] },
        { type: 'switch', name: 'isActive', label: 'Active' },
      ]}
    />
  );
}

/** One screen for every taxonomy. */
export function TaxonomiesPage() {
  const { can } = useAuth();
  const tabs = [
    can(PERMISSIONS.FAQS_MANAGE) && {
      value: 'faq-categories',
      label: 'FAQ categories',
      el: (
        <DialogCrud<any> embedded title="" singular="Category" permission={PERMISSIONS.FAQS_MANAGE} endpoint="/admin/faq-categories" reorderable labelOf={(r) => r.name} schema={faqCategoryInputSchema} defaults={{ name: '', slug: '', displayOrder: 0 }}
          columns={[{ key: 'n', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span> }, { key: 'c', header: 'FAQs', cell: (r) => r._count?.faqs ?? 0 }]}
          fields={[{ type: 'text', name: 'name', label: 'Name', required: true }, { type: 'slug', name: 'slug', label: 'Slug', from: 'name' }, { type: 'number', name: 'displayOrder', label: 'Display order' }]} />
      ),
    },
  ].filter(Boolean) as { value: string; label: string; el: React.ReactNode }[];

  return (
    <>
      <PageHeader title="Categories" description="Organise FAQ categories." />
      <Tabs.Root defaultValue={tabs[0]?.value}>
        <Tabs.List className="mb-5 flex flex-wrap gap-1 border-b" aria-label="Taxonomies">
          {tabs.map((t) => (
            <Tabs.Trigger key={t.value} value={t.value} className={cn('-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground')}>
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map((t) => (
          <Tabs.Content key={t.value} value={t.value}>
            {t.el}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </>
  );
}
