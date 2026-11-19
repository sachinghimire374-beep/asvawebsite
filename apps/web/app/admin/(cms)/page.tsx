'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Briefcase, FileText, Inbox, Mail, MailCheck, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { LABELS, LEAD_STATUSES } from '@asva/shared';
import { useAuth } from '@/components/admin/auth';
import { FilterSelect, PageHeader, StatCard, StatusBadge } from '@/components/admin/ui';
import { Alert, Card, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api/client';
import { formatDate, relativeTime } from '@/lib/utils';

interface Overview {
  days: number;
  generatedAt: string;
  content: { services: number; pages: number; scheduledPages: number; draftPages: number } | null;
  leads: { new: number; period: number; previousPeriod: number; byStatus: Record<string, number>; recent: any[]; daily: { day: string; count: number }[] } | null;
  contact: { unread: number; period: number; previousPeriod: number } | null;
  careers: { openJobs: number; newApplications: number; period: number; recent: any[] } | null;
  newsletter: { subscribed: number; period: number } | null;
  activity: { id: string; action: string; targetType: string | null; actorEmail: string | null; createdAt: string }[] | null;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <span>No change vs previous period</span>;
  const diff = current - previous;
  const Icon = diff >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={diff >= 0 ? 'text-success' : 'text-destructive'}>
      <Icon className="inline size-3" aria-hidden /> {diff >= 0 ? '+' : ''}
      {diff} vs previous period ({previous})
    </span>
  );
}

/** Accessible bar chart drawn with SVG from real daily counts (zero-filled). */
function DailyChart({ data, days, now }: { data: { day: string; count: number }[]; days: number; now: string }) {
  const map = new Map(data.map((d) => [d.day, d.count]));
  const series = Array.from({ length: days }, (_, i) => {
    const d = new Date(new Date(now).getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day: d, count: map.get(d) ?? 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((n, s) => n + s.count, 0);
  const w = 100 / series.length;
  return (
    <figure>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={`Project inquiries per day over the last ${days} days, ${total} in total`}>
        {series.map((s, i) => {
          const h = (s.count / max) * 36;
          return (
            <rect key={s.day} x={i * w + w * 0.15} y={40 - h} width={w * 0.7} height={Math.max(h, s.count ? 0.8 : 0.3)} rx={0.4} className={s.count ? 'fill-[var(--brand)]' : 'fill-slate-200'}>
              <title>{`${formatDate(s.day)}: ${s.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatDate(series[0]!.day)}</span>
        <span>{total} inquiries · peak {max === 1 && total === 0 ? 0 : max}/day</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [days, setDays] = useState('30');
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard', days], queryFn: () => api<Overview>('/admin/dashboard', { query: { days } }) });

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description="Live figures from the website database."
        actions={<FilterSelect label="Period" value={days} onChange={setDays} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />}
      />
      {error && <Alert variant="error">Could not load the dashboard.</Alert>}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.leads && <StatCard label="New inquiries" value={data.leads.new} icon={Inbox} href="/admin/inquiries?status=NEW" hint={<Trend current={data.leads.period} previous={data.leads.previousPeriod} />} />}
            {data.contact && <StatCard label="Unread messages" value={data.contact.unread} icon={Mail} href="/admin/contact" hint={<Trend current={data.contact.period} previous={data.contact.previousPeriod} />} />}
            {data.careers && <StatCard label="Open vacancies" value={data.careers.openJobs} icon={Briefcase} href="/admin/jobs" hint={`${data.careers.newApplications} new applications`} />}
            {data.newsletter && <StatCard label="Subscribers" value={data.newsletter.subscribed} icon={MailCheck} href="/admin/newsletter" hint={`${data.newsletter.period} sign-ups in period`} />}
            {data.content && (
              <>
                <StatCard label="Published services" value={data.content.services} icon={Wrench} href="/admin/services" />
                <StatCard label="Published pages" value={data.content.pages} icon={FileText} href="/admin/pages" hint={`${data.content.scheduledPages} scheduled · ${data.content.draftPages} drafts`} />
              </>
            )}
          </div>

          {data.leads && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <h2 className="font-semibold">Inquiries over time</h2>
                <div className="mt-4">
                  <DailyChart data={data.leads.daily} days={data.days} now={data.generatedAt} />
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="font-semibold">Pipeline</h2>
                <ul className="mt-4 space-y-2">
                  {LEAD_STATUSES.map((s) => {
                    const count = data.leads!.byStatus[s] ?? 0;
                    const total = Object.values(data.leads!.byStatus).reduce((a, b) => a + b, 0) || 1;
                    return (
                      <li key={s}>
                        <Link href={`/admin/inquiries?status=${s}`} className="block rounded-md px-1 py-1 hover:bg-muted">
                          <div className="flex justify-between text-sm">
                            <span>{LABELS.leadStatus[s]}</span>
                            <span className="tabular-nums text-muted-foreground">{count}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${(count / total) * 100}%` }} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {data.leads && (
              <Card className="p-5">
                <h2 className="font-semibold">Recent inquiries</h2>
                {data.leads.recent.length ? (
                  <ul className="mt-3 divide-y">
                    {data.leads.recent.map((i) => (
                      <li key={i.id}>
                        <Link href={`/admin/inquiries/${i.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{i.fullName}{i.companyName ? ` · ${i.companyName}` : ''}</span>
                            <span className="text-xs text-muted-foreground">{i.projectType} · {relativeTime(i.createdAt)}</span>
                          </span>
                          <StatusBadge status={i.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No inquiries yet.</p>
                )}
              </Card>
            )}
            {data.careers && data.careers.recent.length > 0 && (
              <Card className="p-5">
                <h2 className="font-semibold">Recent applications</h2>
                <ul className="mt-3 divide-y">
                  {data.careers.recent.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/applications/${a.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{a.fullName}</span>
                          <span className="text-xs text-muted-foreground">{a.job?.title ?? 'General application'} · {relativeTime(a.createdAt)}</span>
                        </span>
                        <StatusBadge status={a.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {data.activity && (
              <Card className="p-5">
                <h2 className="font-semibold">Recent activity</h2>
                {data.activity.length ? (
                  <ul className="mt-3 space-y-3">
                    {data.activity.map((a) => (
                      <li key={a.id} className="flex gap-3 text-sm">
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                          <code className="text-xs">{a.action}</code> <span className="text-muted-foreground">by {a.actorEmail ?? 'system'} · {relativeTime(a.createdAt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
                )}
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}
