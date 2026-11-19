'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CONTENT_STATUSES,
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  jobInputSchema,
  LABELS,
  pageInputSchema,
  PERMISSIONS,
  serviceInputSchema,
  WORKPLACE_TYPES,
} from '@asva/shared';
import type { FieldDef } from './fields';
import { ResourceEditor, type EditorSection } from './resource';

const statusOptions = CONTENT_STATUSES.map((s) => ({ value: s, label: LABELS.contentStatus[s] }));

const publication: EditorSection = {
  title: 'Publishing',
  aside: true,
  description: 'Published items with a future date are scheduled automatically.',
  fields: [
    { type: 'select', name: 'status', label: 'Status', options: statusOptions },
    { type: 'datetime', name: 'publishedAt', label: 'Publication date', hint: 'Leave empty to publish immediately. A future date schedules publication.' },
  ],
};

const seo = (extra: FieldDef[] = []): EditorSection => ({
  title: 'SEO',
  aside: true,
  description: 'Falls back to the title and summary when empty.',
  fields: [{ type: 'text', name: 'seoTitle', label: 'SEO title', hint: 'Up to 70 characters' }, { type: 'textarea', name: 'seoDescription', label: 'Meta description', rows: 3, maxLength: 170 }, ...extra],
});

const nullable = (r: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));

export function PageEditor({ id }: { id: string }) {
  return (
    <ResourceEditor
      id={id}
      singular="Page"
      permission={PERMISSIONS.PAGES_MANAGE}
      endpoint="/admin/pages"
      listHref="/admin/pages"
      schema={pageInputSchema}
      defaults={{ title: '', slug: '', excerpt: '', content: '', featuredImageId: null, noIndex: false, seoTitle: '', seoDescription: '', status: 'DRAFT', publishedAt: null, revisionNote: '' }}
      toForm={(r) => ({ ...r, featuredImageId: r.featuredImage?.id ?? r.featuredImageId ?? null, ...nullable(r, ['excerpt', 'seoTitle', 'seoDescription']), revisionNote: '' })}
      previewHref={(r) => `/admin/preview/page/${r.id}`}
      publicHref={(r) => (r.status === 'PUBLISHED' ? `/${r.slug}` : null)}
      canDelete={(r) => !r.isSystem}
      deleteHint="Unpublish the page before deleting it. System pages cannot be deleted."
      revisions
      sections={[
        {
          title: 'Content',
          fields: [
            { type: 'text', name: 'title', label: 'Title', required: true, span: 2 },
            { type: 'slug', name: 'slug', label: 'URL slug', from: 'title', prefix: '/', span: 2 },
            { type: 'textarea', name: 'excerpt', label: 'Excerpt', rows: 2 },
            { type: 'rich', name: 'content', label: 'Body' },
            { type: 'text', name: 'revisionNote', label: 'Revision note', hint: 'Optional — describe what changed', span: 2 },
          ],
        },
        publication,
        { title: 'Featured image', aside: true, fields: [{ type: 'media', name: 'featuredImageId', label: 'Image' }] },
        seo([{ type: 'switch', name: 'noIndex', label: 'Hide from search engines', hint: 'Adds noindex and excludes the page from the sitemap' }]),
      ]}
    />
  );
}

export function ServiceEditor({ id }: { id: string }) {
  return (
    <ResourceEditor
      id={id}
      singular="Service"
      permission={PERMISSIONS.SERVICES_MANAGE}
      endpoint="/admin/services"
      listHref="/admin/services"
      schema={serviceInputSchema}
      defaults={{ name: '', slug: '', shortDescription: '', description: '', icon: 'Code2', coverImageId: null, features: [], technologyIds: [], displayOrder: 0, seoTitle: '', seoDescription: '', status: 'DRAFT', publishedAt: null }}
      toForm={(r) => ({ ...r, coverImageId: r.coverImage?.id ?? null, ...nullable(r, ['seoTitle', 'seoDescription']) })}
      previewHref={(r) => `/admin/preview/service/${r.id}`}
      publicHref={(r) => (r.status === 'PUBLISHED' ? `/services/${r.slug}` : null)}
      deleteHint="Unpublish the service before deleting it."
      sections={[
        {
          title: 'Service details',
          fields: [
            { type: 'text', name: 'name', label: 'Name', required: true },
            { type: 'slug', name: 'slug', label: 'URL slug', from: 'name', prefix: '/services/' },
            { type: 'textarea', name: 'shortDescription', label: 'Short description', required: true, rows: 2, maxLength: 300 },
            { type: 'rich', name: 'description', label: 'Full description' },
            { type: 'stringList', name: 'features', label: 'Features', hint: 'Shown as a checklist on the service page' },
            { type: 'multi', name: 'technologyIds', label: 'Technologies used', options: { endpoint: '/admin/technologies', labelKey: 'name' } },
          ],
        },
        publication,
        {
          title: 'Display',
          aside: true,
          fields: [
            { type: 'number', name: 'displayOrder', label: 'Display order', hint: 'Lower numbers appear first' },
            { type: 'media', name: 'coverImageId', label: 'Cover image' },
          ],
        },
        { title: 'Icon', aside: true, fields: [{ type: 'icon', name: 'icon', label: 'Icon' }] },
        seo(),
      ]}
    />
  );
}

export function JobEditor({ id }: { id: string }) {
  return (
    <ResourceEditor
      id={id}
      singular="Job"
      permission={PERMISSIONS.JOBS_MANAGE}
      endpoint="/admin/jobs"
      listHref="/admin/jobs"
      schema={jobInputSchema}
      defaults={{ title: '', slug: '', department: '', location: 'Pokhara, Nepal', employmentType: 'FULL_TIME', workplaceType: 'ONSITE', summary: '', description: '', salaryRange: '', deadline: null, status: 'DRAFT', seoTitle: '', seoDescription: '' }}
      toForm={(r) => ({ ...r, ...nullable(r, ['salaryRange', 'seoTitle', 'seoDescription']) })}
      publicHref={(r) => (r.status === 'OPEN' ? `/careers/${r.slug}` : null)}
      canDelete={(r) => r._count?.applications === 0}
      deleteHint="Vacancies with applications cannot be deleted — archive them instead."
      sections={[
        {
          title: 'Vacancy',
          fields: [
            { type: 'text', name: 'title', label: 'Job title', required: true },
            { type: 'slug', name: 'slug', label: 'URL slug', from: 'title', prefix: '/careers/' },
            { type: 'text', name: 'department', label: 'Department', required: true },
            { type: 'text', name: 'location', label: 'Location', required: true },
            { type: 'select', name: 'employmentType', label: 'Employment type', options: EMPLOYMENT_TYPES.map((t) => ({ value: t, label: LABELS.employmentType[t] })) },
            { type: 'select', name: 'workplaceType', label: 'Workplace', options: WORKPLACE_TYPES.map((t) => ({ value: t, label: LABELS.workplaceType[t] })) },
            { type: 'text', name: 'salaryRange', label: 'Salary range', hint: 'Optional' },
            { type: 'date', name: 'deadline', label: 'Application deadline' },
            { type: 'textarea', name: 'summary', label: 'Summary', required: true, rows: 2 },
            { type: 'rich', name: 'description', label: 'Job description', hint: 'Responsibilities, requirements and benefits' },
          ],
        },
        {
          title: 'Status',
          aside: true,
          description: 'Open publishes the vacancy; Closed stops new applications; Archived hides it.',
          fields: [{ type: 'select', name: 'status', label: 'Status', options: JOB_STATUSES.map((s) => ({ value: s, label: LABELS.jobStatus[s] })) }],
        },
        seo(),
      ]}
    />
  );
}
