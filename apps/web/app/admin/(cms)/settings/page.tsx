'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PERMISSIONS, SETTINGS_SCHEMAS, SOCIAL_PLATFORMS, type SettingsGroup, type SettingsValues } from '@asva/shared';
import { RequirePermission } from '@/components/admin/auth';
import { FieldGrid, type FieldDef } from '@/components/admin/fields';
import { PageHeader, useUnsavedChanges } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Alert, Card, Skeleton } from '@/components/ui/primitives';
import { api, ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

const cta = (base: string, label: string): FieldDef[] => [
  { type: 'text', name: `${base}.label`, label: `${label} label` },
  { type: 'text', name: `${base}.href`, label: `${label} link`, hint: '/path or https://…' },
];

const sectionHeading = (base: string, title: string, toggle = true): FieldDef[] => [
  { type: 'heading', name: `${base}._h`, label: title },
  ...(toggle ? [{ type: 'switch', name: `${base}.enabled`, label: 'Show this section', span: 2 } as FieldDef] : []),
  { type: 'text', name: `${base}.heading`, label: 'Heading', span: 2 },
  { type: 'textarea', name: `${base}.subheading`, label: 'Subheading', rows: 2 },
];

const TABS: { group: SettingsGroup; label: string; description: string; fields: FieldDef[] }[] = [
  {
    group: 'general',
    label: 'Company',
    description: 'Core company information used across the website and structured data.',
    fields: [
      { type: 'text', name: 'companyName', label: 'Legal company name', required: true },
      { type: 'text', name: 'shortName', label: 'Short name', required: true },
      { type: 'text', name: 'tagline', label: 'Tagline', span: 2 },
      { type: 'textarea', name: 'description', label: 'Company description', rows: 3 },
      { type: 'textarea', name: 'positioning', label: 'Positioning statement', rows: 3 },
      { type: 'text', name: 'city', label: 'City' },
      { type: 'text', name: 'country', label: 'Country' },
    ],
  },
  {
    group: 'branding',
    label: 'Branding',
    description: 'Leave logos empty to use the built-in vector logo. Colours apply to buttons and accents site-wide.',
    fields: [
      { type: 'media', name: 'logoForDarkBgId', label: 'Logo for dark backgrounds (light version)' },
      { type: 'media', name: 'logoForLightBgId', label: 'Logo for light backgrounds (dark version)' },
      { type: 'media', name: 'logoIconId', label: 'Icon-only logo' },
      { type: 'media', name: 'faviconId', label: 'Favicon (PNG, square)' },
      { type: 'media', name: 'ogImageId', label: 'Default social sharing image (1200×630)' },
      { type: 'color', name: 'primaryColor', label: 'Primary colour' },
      { type: 'color', name: 'accentColor', label: 'Accent colour' },
    ],
  },
  {
    group: 'contact',
    label: 'Contact',
    description: 'Shown on the contact page, footer and in structured data. Empty fields are hidden.',
    fields: [
      { type: 'email', name: 'email', label: 'Contact email' },
      { type: 'text', name: 'phone', label: 'Phone (with country code)' },
      { type: 'text', name: 'whatsapp', label: 'WhatsApp number' },
      { type: 'text', name: 'addressLine', label: 'Street address' },
      { type: 'text', name: 'city', label: 'City' },
      { type: 'text', name: 'country', label: 'Country' },
      { type: 'url', name: 'mapEmbedUrl', label: 'Map embed URL', hint: 'Google Maps → Share → Embed a map → copy the src URL', span: 2 },
      { type: 'array', name: 'businessHours', label: 'Business hours', itemLabel: 'Row', fields: [{ type: 'text', name: 'label', label: 'Days' }, { type: 'text', name: 'hours', label: 'Hours' }] },
    ],
  },
  {
    group: 'social',
    label: 'Social',
    description: 'Only add profiles the company actually owns.',
    fields: [
      {
        type: 'array',
        name: 'links',
        label: 'Social profiles',
        itemLabel: 'Profile',
        fields: [
          { type: 'select', name: 'platform', label: 'Platform', options: SOCIAL_PLATFORMS.map((p) => ({ value: p, label: p })) },
          { type: 'text', name: 'label', label: 'Label' },
          { type: 'url', name: 'url', label: 'URL', span: 2 },
        ],
      },
    ],
  },
  {
    group: 'home',
    label: 'Homepage',
    description: 'Every homepage section heading, text and call to action.',
    fields: [
      { type: 'heading', name: 'hero._h', label: 'Hero' },
      { type: 'text', name: 'hero.eyebrow', label: 'Eyebrow', span: 2 },
      { type: 'textarea', name: 'hero.headline', label: 'Headline', rows: 2 },
      { type: 'textarea', name: 'hero.subheadline', label: 'Supporting text', rows: 3 },
      ...cta('hero.primaryCta', 'Primary button'),
      ...cta('hero.secondaryCta', 'Secondary button'),
      { type: 'media', name: 'hero.imageId', label: 'Hero image (optional — replaces the illustration)' },
      { type: 'heading', name: 'intro._h', label: 'Company introduction' },
      { type: 'text', name: 'intro.eyebrow', label: 'Eyebrow' },
      { type: 'text', name: 'intro.heading', label: 'Heading' },
      { type: 'textarea', name: 'intro.body', label: 'Body', rows: 4 },
      ...cta('intro.cta', 'Button'),
      { type: 'heading', name: 'services._h', label: 'Services section' },
      { type: 'text', name: 'services.heading', label: 'Heading' },
      { type: 'number', name: 'services.limit', label: 'Number of services shown' },
      { type: 'textarea', name: 'services.subheading', label: 'Subheading', rows: 2 },
      ...sectionHeading('whyChooseUs', 'Why choose us'),
      { type: 'array', name: 'whyChooseUs.items', label: 'Strengths', itemLabel: 'Strength', fields: [{ type: 'text', name: 'title', label: 'Title' }, { type: 'textarea', name: 'description', label: 'Description', rows: 2 }, { type: 'icon', name: 'icon', label: 'Icon' }] },
      ...sectionHeading('process', 'Development process'),
      { type: 'array', name: 'process.steps', label: 'Steps', itemLabel: 'Step', fields: [{ type: 'text', name: 'title', label: 'Title' }, { type: 'textarea', name: 'description', label: 'Description', rows: 2 }] },
      ...sectionHeading('technologies', 'Technology stack'),
      ...sectionHeading('testimonials', 'Testimonials (shown only when approved testimonials exist)', false),
      { type: 'heading', name: 'cta._h', label: 'Call to action' },
      { type: 'text', name: 'cta.heading', label: 'Heading', span: 2 },
      { type: 'textarea', name: 'cta.body', label: 'Body', rows: 2 },
      ...cta('cta.button', 'Button'),
    ],
  },
  {
    group: 'about',
    label: 'About page',
    description: 'Avoid unverified history or achievements.',
    fields: [
      { type: 'text', name: 'heading', label: 'Heading', span: 2 },
      { type: 'textarea', name: 'intro', label: 'Introduction', rows: 4 },
      { type: 'textarea', name: 'mission', label: 'Mission', rows: 3 },
      { type: 'textarea', name: 'vision', label: 'Vision', rows: 3 },
      { type: 'array', name: 'values', label: 'Company values', itemLabel: 'Value', fields: [{ type: 'text', name: 'title', label: 'Title' }, { type: 'textarea', name: 'description', label: 'Description', rows: 2 }, { type: 'icon', name: 'icon', label: 'Icon' }] },
      { type: 'text', name: 'approachHeading', label: 'Approach heading', span: 2 },
      { type: 'textarea', name: 'approach', label: 'Approach', rows: 5 },
      { type: 'switch', name: 'showTeam', label: 'Show team members', span: 2 },
      { type: 'array', name: 'timeline', label: 'Company timeline (optional)', itemLabel: 'Milestone', fields: [{ type: 'text', name: 'year', label: 'Year' }, { type: 'text', name: 'title', label: 'Title' }, { type: 'textarea', name: 'description', label: 'Description', rows: 2 }] },
    ],
  },
  {
    group: 'footer',
    label: 'Footer',
    description: 'Footer text and newsletter block.',
    fields: [
      { type: 'textarea', name: 'description', label: 'Footer description', rows: 3 },
      { type: 'text', name: 'copyrightName', label: 'Copyright name', span: 2 },
      { type: 'switch', name: 'newsletterEnabled', label: 'Show newsletter sign-up', span: 2 },
      { type: 'text', name: 'newsletterHeading', label: 'Newsletter heading' },
      { type: 'text', name: 'newsletterBody', label: 'Newsletter text' },
    ],
  },
  {
    group: 'careers',
    label: 'Careers',
    description: 'Careers page introduction and general applications.',
    fields: [
      { type: 'textarea', name: 'intro', label: 'Introduction', rows: 3 },
      { type: 'switch', name: 'acceptGeneralApplications', label: 'Accept general applications', span: 2 },
      { type: 'textarea', name: 'noVacanciesMessage', label: 'Message when there are no vacancies', rows: 2 },
    ],
  },
  {
    group: 'seo',
    label: 'SEO',
    description: 'Defaults used when a page has no SEO fields of its own.',
    fields: [
      { type: 'text', name: 'defaultTitle', label: 'Default title', span: 2 },
      { type: 'text', name: 'titleTemplate', label: 'Title template', hint: 'Use %s for the page title, e.g. “%s | Asva Innovation Lab”', span: 2 },
      { type: 'textarea', name: 'defaultDescription', label: 'Default meta description', rows: 3, maxLength: 170 },
      { type: 'text', name: 'searchConsoleVerification', label: 'Google Search Console verification code', hint: 'The content value of the google-site-verification meta tag', span: 2 },
    ],
  },
  {
    group: 'analytics',
    label: 'Analytics',
    description: 'Tracking only loads after visitors accept analytics cookies.',
    fields: [
      { type: 'switch', name: 'enabled', label: 'Enable analytics', span: 2 },
      { type: 'text', name: 'ga4MeasurementId', label: 'GA4 measurement ID', placeholder: 'G-XXXXXXXXXX' },
      { type: 'text', name: 'gtmContainerId', label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX' },
    ],
  },
  {
    group: 'cookies',
    label: 'Cookies',
    description: 'The consent banner appears only when analytics are enabled.',
    fields: [
      { type: 'switch', name: 'bannerEnabled', label: 'Show consent banner', span: 2 },
      { type: 'textarea', name: 'message', label: 'Banner message', rows: 3 },
      { type: 'text', name: 'policyHref', label: 'Cookie policy link', span: 2 },
    ],
  },
  {
    group: 'maintenance',
    label: 'Maintenance',
    description: 'Shows a maintenance page to visitors. The admin panel stays available.',
    fields: [
      { type: 'switch', name: 'enabled', label: 'Maintenance mode', span: 2 },
      { type: 'textarea', name: 'message', label: 'Message', rows: 3 },
    ],
  },
  {
    group: 'notifications',
    label: 'Notifications',
    description: 'Private: who receives emails about new submissions. Never shown on the website.',
    fields: [
      { type: 'stringList', name: 'leadRecipients', label: 'Project inquiry recipients', placeholder: 'sales@company.com' },
      { type: 'stringList', name: 'contactRecipients', label: 'Contact form recipients' },
      { type: 'stringList', name: 'careersRecipients', label: 'Job application recipients' },
      { type: 'switch', name: 'sendSubmitterConfirmations', label: 'Send confirmation emails to people who submit forms', span: 2 },
    ],
  },
];

function GroupForm({ group, fields, value }: { group: SettingsGroup; fields: FieldDef[]; value: unknown }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<any>({ resolver: zodResolver(SETTINGS_SCHEMAS[group] as never), defaultValues: value as object });
  useEffect(() => form.reset(value as object), [value, form]);
  useUnsavedChanges(form.formState.isDirty);
  const save = useMutation({
    mutationFn: (v: unknown) => api('/admin/settings', { method: 'PATCH', body: { group, value: v } }),
    onSuccess: (saved) => {
      toast.success('Settings saved — the website updates within seconds.');
      setError(null);
      qc.setQueryData(['/admin/settings'], (old: SettingsValues | undefined) => (old ? { ...old, [group]: saved } : old));
      form.reset(saved as object);
    },
    onError: (e) => {
      if (e instanceof ApiError) for (const d of e.details) form.setError(d.path as never, { message: d.message });
      setError(e instanceof ApiError ? e.message : 'Could not save settings');
    },
  });
  return (
    <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v), () => setError('Please correct the highlighted fields.'))} className="space-y-5">
      <FieldGrid fields={fields} form={form} />
      {error && <Alert variant="error">{error}</Alert>}
      <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 border-t bg-background/95 px-5 py-3 backdrop-blur">
        {form.formState.isDirty && <span className="text-xs font-medium text-warning">Unsaved changes</span>}
        <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
          <Save /> Save {group}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['/admin/settings'], queryFn: () => api<SettingsValues>('/admin/settings') });
  return (
    <RequirePermission permission={PERMISSIONS.SETTINGS_MANAGE}>
      <PageHeader title="Global settings" description="Changes are validated, audited and published to the website automatically. Secrets such as SMTP passwords are configured on the server, never here." />
      {isLoading || !data ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs.Root defaultValue="general" orientation="vertical" className="grid gap-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
          <Tabs.List aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
            {TABS.map((t) => (
              <Tabs.Trigger key={t.group} value={t.group} className={cn('whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm')}>
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {TABS.map((t) => (
            <Tabs.Content key={t.group} value={t.group}>
              <Card className="p-5">
                <h2 className="text-lg font-semibold">{t.label}</h2>
                <p className="mb-5 text-sm text-muted-foreground">{t.description}</p>
                <GroupForm group={t.group} fields={t.fields} value={data[t.group]} />
              </Card>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
    </RequirePermission>
  );
}
