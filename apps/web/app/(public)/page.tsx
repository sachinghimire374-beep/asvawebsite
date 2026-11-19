import type { Metadata } from 'next';
import Link from 'next/link';
import { ServiceFeature } from '@/components/site/cards';
import { TechMarquee } from '@/components/site/tech-marquee';
import { BackdropImage, Eyebrow, Section, SectionHeading, TextLink } from '@/components/site/blocks';
import { SITE_IMAGES } from '@/lib/site-images';
import { Reveal } from '@/components/site/reveal';
import { HeroVisual } from '@/components/site/hero-visual';
import { Button } from '@/components/ui/button';
import { COURSES } from '@/lib/courses';
import { getServices, getSettings, getTechnologies, getTestimonials } from '@/lib/api/public';
import { buildMetadata } from '@/lib/seo';

const enter = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(await getSettings(), { path: '/' });
}

export default async function HomePage() {
  const [settings, services, technologies, testimonials] = await Promise.all([getSettings(), getServices(), getTechnologies(), getTestimonials()]);
  const { home } = settings;

  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section aria-labelledby="hero-title" className="hero-scene relative isolate overflow-hidden border-b border-white/10 bg-ink text-white">
        <div aria-hidden className="hero-glow pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
        <div aria-hidden className="hero-orb hero-orb-one pointer-events-none absolute -right-20 top-12 -z-10 size-64 rounded-full bg-brand/10 blur-3xl sm:size-80" />
        <div aria-hidden className="hero-orb hero-orb-two pointer-events-none absolute bottom-0 left-[38%] -z-10 size-48 rounded-full bg-accent/15 blur-3xl" />
        <div className="container-page grid items-center gap-14 pb-16 pt-12 sm:pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-24">
          <div className="lg:col-span-7">
            {home.hero.eyebrow && (
              <p className="hero-in text-[13px] font-semibold tracking-[0.08em] text-brand-vivid" style={enter(0)}>
                {home.hero.eyebrow}
              </p>
            )}
            <h1 id="hero-title" className="type-hero hero-in mt-6 max-w-3xl text-white" style={enter(90)}>
              {home.hero.headline}
            </h1>
            <div className="hero-in mt-6 h-1 w-16 rounded-full bg-brand" style={enter(150)} aria-hidden />
            <p className="type-lead hero-in mt-5 max-w-xl text-mist" style={enter(190)}>
              {home.hero.subheadline}
            </p>
            <div className="hero-in mt-9 flex flex-col gap-3 sm:flex-row" style={enter(290)}>
              <Button asChild size="lg">
                <Link href={home.hero.primaryCta.href}>{home.hero.primaryCta.label}</Link>
              </Button>
              <Button asChild size="lg" variant="outline-dark">
                <Link href="/services">Explore our services</Link>
              </Button>
            </div>
          </div>
          <div className="hero-in hero-visual-wrap lg:col-span-5" style={enter(380)}>
            <HeroVisual
              services={services}
              image={settings.media.heroImage ? { src: settings.media.heroImage.url, alt: settings.media.heroImage.alt } : null}
              location={[settings.general.city, settings.general.country].filter(Boolean).join(', ')}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ Introduction (editorial) */}
      <Section labelledBy="intro-title" className="pb-0 sm:pb-0 lg:pb-0">
        <div className="container-page grid gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">{home.intro.eyebrow && <Eyebrow>{home.intro.eyebrow}</Eyebrow>}</div>
          <Reveal className="lg:col-span-8">
            <h2 id="intro-title" className="type-section max-w-3xl text-ink">
              {home.intro.heading}
            </h2>
            <p className="type-lead mt-6 max-w-2xl text-muted-ink">{home.intro.body}</p>
            <div className="mt-7">
              <TextLink href={home.intro.cta.href}>{home.intro.cta.label}</TextLink>
            </div>
          </Reveal>
        </div>
        {home.whyChooseUs.enabled && home.whyChooseUs.items.length > 0 && (
          <div className="container-page mt-16 lg:mt-20">
            <h3 className="sr-only">{home.whyChooseUs.heading}</h3>
            <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {home.whyChooseUs.items.map((item, i) => (
                <Reveal key={item.title} delay={(i % 3) * 90} className="border-t pt-5">
                  <dt className="text-[15px] font-medium text-ink">{item.title}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-muted-ink">{item.description}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
        )}
      </Section>

      {/* ------------------------------------------------------------------ Services (alternating photo / description) */}
      {services.length > 0 && (
        <Section tone="muted" labelledBy="services-title">
          <div className="container-page">
            <SectionHeading id="services-title" title={home.services.heading} description={home.services.subheading} />
            <div className="mt-14 space-y-16 lg:mt-16 lg:space-y-24">
              {services.slice(0, home.services.limit).map((service, i) => (
                <Reveal key={service.id}>
                  <ServiceFeature service={service} index={i} />
                </Reveal>
              ))}
            </div>
            {services.length > home.services.limit && (
              <Reveal className="mt-14 flex justify-center lg:mt-16">
                <Button asChild size="lg" variant="outline">
                  <Link href="/services">View all {services.length} services</Link>
                </Button>
              </Reveal>
            )}
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ Process (horizontal on wide screens) */}
      {home.process.enabled && home.process.steps.length > 0 && (
        <Section labelledBy="process-title">
          <div className="container-page">
            <SectionHeading id="process-title" title={home.process.heading} description={home.process.subheading} />
            <ol className="mt-12 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {home.process.steps.map((step, i) => (
                <li key={step.title}>
                  <Reveal delay={i * 90}>
                    <span className="reveal-line block h-0.5 bg-brand" aria-hidden />
                    <span className="mt-4 block font-mono text-[12px] font-semibold text-brand">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-3 text-[15px] font-medium leading-snug text-ink">{step.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted-ink">{step.description}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ Technologies (auto-scrolling strip) */}
      {home.technologies.enabled && technologies.length > 0 && (
        <Section tone="muted" labelledBy="tech-title">
          <div className="container-page">
            <div className="max-w-sm">
              <h2 id="tech-title" className="type-section text-ink">
                {home.technologies.heading}
              </h2>
              {home.technologies.subheading && <p className="mt-4 text-[17px] leading-relaxed text-muted-ink">{home.technologies.subheading}</p>}
            </div>
            <Reveal className="mt-10 -mx-5 sm:-mx-8 xl:-mx-10">
              <TechMarquee technologies={technologies} />
            </Reveal>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ Tech classes */}
      <Section labelledBy="classes-title">
        <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="type-label font-semibold text-brand">Learn with Asva</p>
            <h2 id="classes-title" className="type-section mt-3 text-ink">
              Grow your skills with practical technology courses
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-ink sm:text-[17px]">
              Explore courses across different IT fields, led by a team working hands-on in technology.
            </p>
            <Button asChild className="mt-7">
              <Link href="/courses">Explore courses</Link>
            </Button>
          </div>
          <ul className="grid gap-x-8 sm:grid-cols-2 lg:col-span-7">
            {COURSES.map((track, i) => (
              <li key={track.title} className="flex items-center gap-4 border-t py-4">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-white p-2">
                  <svg aria-hidden viewBox="0 0 24 24" className="size-full" fill={`#${track.brand.icon.hex}`}>
                    <path d={track.brand.icon.path} />
                  </svg>
                </div>
                <div>
                  <span aria-hidden className="font-mono text-[11px] font-semibold tracking-[0.12em] text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1 text-[15px] font-medium text-ink">{track.title}</h3>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ------------------------------------------------------------------ Testimonials (approved + consented only) */}
      {testimonials.length > 0 && (
        <Section labelledBy="testimonials-title">
          <div className="container-page">
            <SectionHeading id="testimonials-title" title={home.testimonials.heading} description={home.testimonials.subheading} />
            <ul className="mt-12 grid gap-x-12 gap-y-12 md:grid-cols-2">
              {testimonials.slice(0, 4).map((t) => (
                <li key={t.id}>
                  <figure>
                    <blockquote className="text-xl leading-snug tracking-tight text-ink">“{t.content}”</blockquote>
                    <figcaption className="mt-5 text-[14px]">
                      <span className="font-medium text-ink">{t.clientName}</span>
                      <span className="text-muted-ink">{[t.designation, t.company].filter(Boolean).length ? `, ${[t.designation, t.company].filter(Boolean).join(', ')}` : ''}</span>
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ Closing call to action */}
      <Section tone="dark" labelledBy="cta-title" className="relative overflow-hidden">
        <BackdropImage src={SITE_IMAGES.cloud.src} />
        <div className="container-page relative grid items-end gap-8 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <h2 id="cta-title" className="type-section max-w-2xl text-white">
              {home.cta.heading}
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-mist">{home.cta.body}</p>
          </Reveal>
          <Reveal delay={140} className="lg:col-span-4 lg:justify-self-end">
            <Button asChild size="lg">
              <Link href={home.cta.button.href}>{home.cta.button.label}</Link>
            </Button>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
