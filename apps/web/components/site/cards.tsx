import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Service } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { serviceImage, type SiteImage } from '@/lib/site-images';
import { cn } from '@/lib/utils';

/** A service as a row: name, one-line explanation and an arrow. Rows are separated by dividers, not boxes. */
export function ServiceRow({ service, index = 0 }: { service: Pick<Service, 'name' | 'slug' | 'shortDescription'> & { coverImage?: Service['coverImage'] }; index?: number }) {
  const image: SiteImage = service.coverImage ? { src: service.coverImage.url, alt: service.coverImage.alt } : serviceImage(service, index);
  return (
    <Link href={`/services/${service.slug}`} className="group grid items-center gap-3 py-6 sm:grid-cols-12 sm:gap-6">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border bg-neutral-100 sm:col-span-3 sm:aspect-[4/3]">
        <Image src={image.src} alt={image.alt} fill sizes="(min-width: 640px) 20vw, 100vw" style={image.position ? { objectPosition: image.position } : undefined} className="object-cover" />
      </div>
      <h3 className="text-lg font-medium text-ink transition-[color,transform] duration-300 group-hover:translate-x-1 group-hover:text-brand sm:col-span-3">{service.name}</h3>
      <p className="text-[15px] leading-relaxed text-muted-ink sm:col-span-5">{service.shortDescription}</p>
      <ArrowUpRight className="hidden size-4 justify-self-end text-neutral-400 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand sm:col-span-1 sm:block" aria-hidden />
    </Link>
  );
}

/**
 * A service on the home page: a photo on one side and the explanation on the other, swapping sides
 * on every other service so the section reads as a zig-zag rather than a list. The photo repeats the
 * heading's link, so it is hidden from assistive tech to avoid announcing the same destination twice.
 */
export function ServiceFeature({ service, index = 0 }: { service: Pick<Service, 'name' | 'slug' | 'shortDescription' | 'coverImage'>; index?: number }) {
  const photo: SiteImage = service.coverImage ? { src: service.coverImage.url, alt: service.coverImage.alt } : serviceImage(service, index);
  const flipped = index % 2 === 1;

  return (
    <div className="group grid items-center gap-7 lg:grid-cols-2 lg:gap-16">
      <Link
        href={`/services/${service.slug}`}
        tabIndex={-1}
        aria-hidden
        className={cn('relative block aspect-[4/3] overflow-hidden rounded-lg border bg-surface sm:aspect-[16/10]', flipped && 'lg:order-2')}
      >
        <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 46vw, 100vw" style={photo.position ? { objectPosition: photo.position } : undefined} className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        <span aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/5" />
      </Link>

      <div className={cn(flipped && 'lg:order-1')}>
        <span aria-hidden className="font-mono text-[12px] font-semibold tracking-[0.12em] text-brand">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="mt-3 text-[26px] font-medium leading-tight tracking-tight text-ink sm:text-[30px]">
          <Link href={`/services/${service.slug}`} className="transition-colors hover:text-brand focus-visible:text-brand">
            {service.name}
          </Link>
        </h3>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-muted-ink">{service.shortDescription}</p>
        <Button asChild variant="outline" className="mt-7">
          <Link href={`/services/${service.slug}`}>
            Learn more
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
