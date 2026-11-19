import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type AuthUser } from '@asva/shared';
import { Logo } from '@/components/brand/logo';
import { AuthGate, RequirePermission } from '@/components/admin/auth';
import { DataTable, StatusBadge } from '@/components/admin/ui';
import { ServiceFeature, ServiceRow } from '@/components/site/cards';
import { MobileNav, NavLink } from '@/components/site/header-client';
import type { PublicSettings } from '@/lib/types';

const settings = { ...DEFAULT_SETTINGS, media: { logoForDarkBg: null, logoForLightBg: null, logoIcon: null, favicon: null, ogImage: null, heroImage: null } } as unknown as PublicSettings;

function withQuery(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function mockMe(user: Partial<AuthUser> | null, status = 200) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    user
      ? new Response(JSON.stringify({ data: { id: '1', email: 'a@b.c', name: 'Test User', roles: [], lastLoginAt: null, permissions: [], ...user } }), { status })
      : new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in' } }), { status: 401 }),
  );
}

describe('Brand', () => {
  it('renders the accessible vector logo, or an uploaded override', () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByRole('img', { name: /asva innovation lab/i })).toBeInTheDocument();
    rerender(<Logo uploaded={{ id: '1', url: '/api/v1/media/files/1/abc', alt: 'Official logo', caption: null, width: 200, height: 50, mimeType: 'image/png' }} />);
    expect(screen.getByAltText('Official logo')).toBeInTheDocument();
  });
});

describe('Navigation', () => {
  it('marks the current page with aria-current', () => {
    render(<NavLink item={{ id: '1', label: 'Home', href: '/', isExternal: false, openInNewTab: false }} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });
  it('has an accessible mobile menu trigger', () => {
    render(<MobileNav items={[{ id: '1', label: 'Services', href: '/services', isExternal: false, openInNewTab: false }]} settings={settings} />);
    expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
  });
});

describe('Public content rendering', () => {

  it('uses the company custom-software photo on both home feature and services row', () => {
    const customService = {
      name: 'Custom Software Development',
      slug: 'custom-software-development',
      shortDescription: 'Software designed around your processes.',
      coverImage: null,
    };

    const { container, rerender } = render(<ServiceFeature service={customService} index={0} />);
    let img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain(encodeURIComponent('/images/company/custom-software.png'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/custom software/i));
    expect(img).toHaveStyle({ objectPosition: '50% 55%' });

    rerender(<ServiceRow service={customService} index={0} />);
    img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain(encodeURIComponent('/images/company/custom-software.png'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/custom software/i));
    expect(img).toHaveStyle({ objectPosition: '50% 55%' });

    const enterpriseService = {
      name: 'Enterprise Software Solutions',
      slug: 'enterprise-software-solutions',
      shortDescription: 'Systems that streamline operations across departments.',
      coverImage: null,
    };

    rerender(<ServiceFeature service={enterpriseService} index={1} />);
    img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain(encodeURIComponent('/images/company/enterprise.webp'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/enterprise software/i));
    expect(img).toHaveStyle({ objectPosition: '50% 50%' });

    rerender(<ServiceRow service={enterpriseService} index={1} />);
    img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toContain(encodeURIComponent('/images/company/enterprise.webp'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/enterprise software/i));
    expect(img).toHaveStyle({ objectPosition: '50% 50%' });
  });
});

describe('Admin UI', () => {
  it('shows loading skeletons and then an empty state', () => {
    const { rerender } = render(<DataTable columns={[{ key: 'n', header: 'Name', cell: (r: { id: string }) => r.id }]} rows={undefined} loading />);
    expect(document.querySelectorAll('[aria-hidden].animate-pulse').length).toBeGreaterThan(0);
    rerender(<DataTable columns={[{ key: 'n', header: 'Name', cell: (r: { id: string }) => r.id }]} rows={[]} empty="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('renders human-readable status badges', () => {
    render(<StatusBadge status="PROPOSAL_SENT" />);
    expect(screen.getByText('Proposal Sent')).toBeInTheDocument();
  });

  it('hides sections the user lacks permission for', async () => {
    mockMe({ permissions: ['pages.manage'] });
    withQuery(
      <AuthGate>
        <RequirePermission permission="settings.manage">
          <p>Secret settings</p>
        </RequirePermission>
        <RequirePermission permission="pages.manage">
          <p>Page editor</p>
        </RequirePermission>
      </AuthGate>,
    );
    expect(await screen.findByText('Page editor')).toBeInTheDocument();
    expect(screen.queryByText('Secret settings')).not.toBeInTheDocument();
    expect(screen.getByText(/don’t have access/i)).toBeInTheDocument();
  });

  it('shows a loading state while the session is being checked', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => undefined));
    withQuery(
      <AuthGate>
        <p>Content</p>
      </AuthGate>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/loading admin/i);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });
});
