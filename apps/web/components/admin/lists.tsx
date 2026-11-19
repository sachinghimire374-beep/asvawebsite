'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { CONTENT_STATUSES, JOB_STATUSES, LABELS, PERMISSIONS } from '@asva/shared';
import { Badge } from '@/components/ui/primitives';
import { formatDate, formatDateTime } from '@/lib/utils';
import { ResourceList } from './resource';
import { StatusBadge } from './ui';

const statusFilter = { name: 'status', label: 'Status', options: [{ value: '', label: 'All statuses' }, ...CONTENT_STATUSES.map((s) => ({ value: s, label: LABELS.contentStatus[s] }))] };

const publishedCell = (r: any) => (
  <div className="text-xs text-muted-foreground">
    <StatusBadge status={r.status} />
    {r.publishedAt && <p className="mt-1">{r.status === 'SCHEDULED' ? `Goes live ${formatDateTime(r.publishedAt)}` : formatDate(r.publishedAt)}</p>}
  </div>
);

export function PagesList() {
  return (
    <ResourceList<any>
      title="Pages"
      description="Standalone pages such as legal pages. Pages appear at /your-slug."
      permission={PERMISSIONS.PAGES_MANAGE}
      endpoint="/admin/pages"
      createHref="/admin/pages/new"
      createLabel="New page"
      rowHref={(r) => `/admin/pages/${r.id}`}
      filters={[statusFilter]}
      canDelete={(r) => !r.isSystem && r.status !== 'PUBLISHED'}
      deleteLabel={(r) => r.title}
      columns={[
        { key: 'title', header: 'Title', cell: (r) => (<div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">/{r.slug}</p></div>) },
        { key: 'status', header: 'Status', cell: publishedCell },
        { key: 'flags', header: '', hideOnMobile: true, cell: (r) => (<div className="flex gap-1">{r.isSystem && <Badge variant="secondary">System</Badge>}{r.noIndex && <Badge variant="outline">noindex</Badge>}</div>) },
        { key: 'updated', header: 'Updated', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.updatedAt)}</span> },
      ]}
    />
  );
}

export function ServicesList() {
  return (
    <ResourceList<any>
      title="Services"
      description="Only publish services the company actually offers. Lower display order appears first."
      permission={PERMISSIONS.SERVICES_MANAGE}
      endpoint="/admin/services"
      createHref="/admin/services/new"
      createLabel="New service"
      rowHref={(r) => `/admin/services/${r.id}`}
      filters={[statusFilter]}
      canDelete={(r) => r.status !== 'PUBLISHED'}
      deleteLabel={(r) => r.name}
      pageSize={50}
      columns={[
        { key: 'name', header: 'Name', cell: (r) => (<div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">/services/{r.slug}</p></div>) },
        { key: 'status', header: 'Status', cell: publishedCell },
        { key: 'order', header: 'Order', hideOnMobile: true, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.displayOrder}</span> },
        { key: 'updated', header: 'Updated', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{formatDateTime(r.updatedAt)}</span> },
      ]}
    />
  );
}


export function JobsList() {
  return (
    <ResourceList<any>
      title="Job listings"
      description="Open vacancies appear on the careers page until their deadline."
      permission={PERMISSIONS.JOBS_MANAGE}
      endpoint="/admin/jobs"
      createHref="/admin/jobs/new"
      createLabel="New vacancy"
      rowHref={(r) => `/admin/jobs/${r.id}`}
      filters={[{ name: 'status', label: 'Status', options: [{ value: '', label: 'All statuses' }, ...JOB_STATUSES.map((s) => ({ value: s, label: LABELS.jobStatus[s] }))] }]}
      canDelete={(r) => r._count?.applications === 0}
      deleteLabel={(r) => r.title}
      columns={[
        { key: 'title', header: 'Title', cell: (r) => (<div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.department} · {r.location}</p></div>) },
        { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
        { key: 'apps', header: 'Applications', cell: (r) => <span className="tabular-nums">{r._count?.applications ?? 0}</span> },
        { key: 'deadline', header: 'Deadline', hideOnMobile: true, cell: (r) => <span className="text-muted-foreground">{r.deadline ? formatDate(r.deadline) : 'None'}</span> },
      ]}
    />
  );
}
