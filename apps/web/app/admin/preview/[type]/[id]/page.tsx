'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Eye } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { AuthGate } from '@/components/admin/auth';
import { StatusBadge } from '@/components/admin/ui';
import { Alert, Skeleton } from '@/components/ui/primitives';
import { api, ApiError } from '@/lib/api/client';
import { formatDateTime } from '@/lib/utils';

const ENDPOINTS: Record<string, { endpoint: string; editHref: string; label: string }> = {
  page: { endpoint: '/admin/pages', editHref: '/admin/pages', label: 'Page' },
  service: { endpoint: '/admin/services', editHref: '/admin/services', label: 'Service' },
};

function Preview({ type, id }: { type: string; id: string }) {
  const config = ENDPOINTS[type];
  const { data, isLoading, error } = useQuery({ queryKey: [config?.endpoint, id], queryFn: () => api<any>(`${config!.endpoint}/${id}`), enabled: Boolean(config) });
  if (!config) return <Alert variant="error">Unknown preview type.</Alert>;
  if (isLoading) return <Skeleton className="m-8 h-96" />;
  if (error || !data) return <Alert variant="error" className="m-8">{error instanceof ApiError ? error.message : 'Not found'}</Alert>;

  const title = data.title ?? data.name;
  const lead = data.excerpt ?? data.summary ?? data.shortDescription;
  const image = data.featuredImage ?? data.coverImage;
  const html = data.content ?? data.description ?? '';

  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950" role="status">
        <span className="flex items-center gap-2">
          <Eye className="size-4" aria-hidden /> Preview of {config.label.toLowerCase()} — <StatusBadge status={data.status} />
          {data.status === 'SCHEDULED' && data.publishedAt && <span>goes live {formatDateTime(data.publishedAt)}</span>}
          <span className="hidden sm:inline">· Visitors cannot see unpublished changes.</span>
        </span>
        <Link href={`${config.editHref}/${id}`} className="rounded-md bg-amber-950 px-3 py-1 text-amber-50 hover:bg-amber-900">
          Back to editor
        </Link>
      </div>
      <header className="border-b bg-white py-14">
        <div className="container-page max-w-4xl">
          {data.category?.name && <p className="type-label">{data.category.name}</p>}
          <h1 className="type-page mt-3 text-ink">{title}</h1>
          {lead && <p className="type-lead mt-5 text-muted-ink">{lead}</p>}

        </div>
      </header>
      <main className="bg-white py-14">
        <div className="container-page max-w-3xl space-y-10">
          {image?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt={image.alt ?? ''} className="w-full rounded-2xl border object-cover" />
          )}

          {data.features?.length > 0 && (
            <ul className="space-y-2">
              {data.features.map((f: string) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="size-5 text-brand" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          )}
          {/* Content is sanitised by the API on save. */}
          <div className="prose prose-lg prose-neutral prose-asva max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </main>
    </>
  );
}

export default function PreviewPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params);
  return (
    <AuthGate>
      <Preview type={type} id={id} />
    </AuthGate>
  );
}
