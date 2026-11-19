'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PERMISSIONS } from '@asva/shared';
import { RequirePermission } from '@/components/admin/auth';
import { DataTable, FilterSelect, PageHeader, PaginationBar, SearchInput, useDebounced } from '@/components/admin/ui';
import { Input } from '@/components/ui/form-controls';
import { apiPaged } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils';

const ACTION_GROUPS = [
  { value: '', label: 'All actions' },
  { value: 'auth.', label: 'Authentication' },
  { value: 'user.', label: 'Users' },
  { value: 'role.', label: 'Roles' },
  { value: 'settings.', label: 'Settings' },
  { value: 'inquiry.', label: 'Leads' },
  { value: 'application.', label: 'Applications' },
  { value: 'page.', label: 'Pages' },
  { value: 'service.', label: 'Services' },
  { value: 'media.', label: 'Media' },
  { value: 'newsletter.', label: 'Newsletter' },
];

export default function AuditLogsPage() {
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q);
  const query = { q: search, action, from, to, page, pageSize: 50 };
  const { data, isLoading } = useQuery({ queryKey: ['/admin/audit-logs', query], queryFn: () => apiPaged<any>('/admin/audit-logs', { query }), placeholderData: keepPreviousData });
  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_READ}>
      <PageHeader title="Audit logs" description="Security and administrative events. Passwords, tokens and secrets are never recorded." />
      <div className="mb-4 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search actor, action or target ID" />
        <FilterSelect label="Action" value={action} onChange={(v) => { setAction(v); setPage(1); }} options={ACTION_GROUPS} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">From <Input type="date" className="h-9 w-auto" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">To <Input type="date" className="h-9 w-auto" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>
      <DataTable
        rows={data?.data}
        loading={isLoading}
        columns={[
          { key: 'when', header: 'When', cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.createdAt)}</span> },
          { key: 'action', header: 'Action', cell: (r) => <code className="text-xs">{r.action}</code> },
          { key: 'actor', header: 'Actor', cell: (r) => r.actor?.name ?? r.actorEmail ?? 'system' },
          { key: 'target', header: 'Target', hideOnMobile: true, cell: (r) => r.targetType ? <span className="text-xs">{r.targetType}<span className="block font-mono text-muted-foreground">{r.targetId}</span></span> : '—' },
          { key: 'meta', header: 'Details', hideOnMobile: true, cell: (r) => r.metadata ? <code className="block max-w-xs truncate text-xs text-muted-foreground" title={JSON.stringify(r.metadata)}>{JSON.stringify(r.metadata)}</code> : null },
          { key: 'ip', header: 'IP', hideOnMobile: true, cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.ipAddress ?? '—'}</span> },
        ]}
      />
      <PaginationBar meta={data?.meta} onPage={setPage} />
    </RequirePermission>
  );
}
