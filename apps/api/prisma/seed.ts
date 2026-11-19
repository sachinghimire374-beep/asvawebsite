/**
 * Database seed.
 *
 *   npm run db:seed                 production-safe base data: permissions, roles, default settings,
 *                                   navigation, legal page templates, suggested services (as drafts),
 *                                   suggested technologies (hidden) and FAQs (unpublished).
 *   npm run db:sync-permissions     only upserts permissions and adds missing default grants to roles.
 *   npm run db:seed:demo            base data + clearly labelled SAMPLE content and demo users for
 *                                   development/testing. Refuses to run when NODE_ENV=production.
 *
 * The seed is idempotent and never overwrites content an administrator has edited.
 */
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { DEFAULT_ROLES, DEFAULT_SETTINGS, LABELS, PERMISSION_DESCRIPTIONS, PRIVATE_SETTINGS_GROUPS, ROLE_KEYS, SETTINGS_GROUPS, type PermissionKey } from '@asva/shared';
import { ContentStatus, JobStatus, PrismaClient, type NavigationMenuKey, type Prisma, type TechnologyCategory } from '../src/generated/prisma/client.js';
import { DEFAULT_NAVIGATION, LEGAL_PAGES, SUGGESTED_FAQS, SUGGESTED_SERVICES, SUGGESTED_TECHNOLOGIES, serviceDescription } from './seed-content.js';

for (const file of ['.env', '../../.env']) if (existsSync(file)) config({ path: file, quiet: true });

const args = new Set(process.argv.slice(2));
const demo = args.has('--demo');
const permissionsOnly = args.has('--permissions-only');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (demo && process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed demo content with NODE_ENV=production.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const log = (msg: string) => console.log(`  • ${msg}`);

async function seedPermissionsAndRoles() {
  for (const [key, meta] of Object.entries(PERMISSION_DESCRIPTIONS)) {
    await prisma.permission.upsert({ where: { key }, create: { key, ...meta }, update: meta });
  }
  const permissions = await prisma.permission.findMany();
  const idOf = new Map(permissions.map((p) => [p.key, p.id]));
  for (const key of ROLE_KEYS) {
    const def = DEFAULT_ROLES[key];
    const role = await prisma.role.upsert({
      where: { key },
      create: { key, name: def.name, description: def.description, isSystem: true },
      update: { name: def.name, isSystem: true },
    });
    await prisma.rolePermission.createMany({
      data: def.permissions.map((p: PermissionKey) => ({ roleId: role.id, permissionId: idOf.get(p)! })),
      skipDuplicates: true,
    });
  }
  log(`${permissions.length} permissions, ${ROLE_KEYS.length} roles`);
}

async function seedSettings() {
  let created = 0;
  for (const group of SETTINGS_GROUPS) {
    const exists = await prisma.siteSetting.findUnique({ where: { group } });
    if (exists) continue;
    await prisma.siteSetting.create({
      data: { group, value: DEFAULT_SETTINGS[group] as Prisma.InputJsonValue, isPublic: !PRIVATE_SETTINGS_GROUPS.includes(group) },
    });
    created++;
  }
  log(`settings: ${created} group(s) created`);
}

async function seedNavigation() {
  for (const [key, items] of Object.entries(DEFAULT_NAVIGATION) as [NavigationMenuKey, readonly { label: string; href: string }[]][]) {
    const menu = await prisma.navigationMenu.upsert({ where: { key }, create: { key, name: LABELS.navigationMenu[key] }, update: {} });
    const count = await prisma.navigationItem.count({ where: { menuId: menu.id } });
    if (count) continue;
    await prisma.navigationItem.createMany({ data: items.map((item, i) => ({ menuId: menu.id, label: item.label, href: item.href, displayOrder: i })) });
  }
  log('navigation menus');
}

async function seedLegalPages() {
  for (const page of LEGAL_PAGES) {
    const exists = await prisma.page.findUnique({ where: { slug: page.slug } });
    if (exists) continue;
    await prisma.page.create({
      data: { ...page, status: ContentStatus.PUBLISHED, publishedAt: new Date(), isSystem: true, revisions: { create: { title: page.title, content: page.content, note: 'Initial template' } } },
    });
  }
  log('legal page templates (marked for legal review)');
}

async function seedSuggestedContent() {
  if ((await prisma.service.count()) === 0) {
    await prisma.service.createMany({
      data: SUGGESTED_SERVICES.map((s, i) => ({
        name: s.name,
        slug: s.slug,
        icon: s.icon,
        shortDescription: s.shortDescription,
        description: serviceDescription(s.name, s.features),
        features: [...s.features],
        displayOrder: i,
        status: ContentStatus.DRAFT,
      })),
    });
    log(`${SUGGESTED_SERVICES.length} suggested services (DRAFT — publish the ones you offer)`);
  }
  if ((await prisma.technology.count()) === 0) {
    await prisma.technology.createMany({
      data: SUGGESTED_TECHNOLOGIES.map((t, i) => ({ ...t, category: t.category as TechnologyCategory, displayOrder: i, isVisible: false })),
    });
    log(`${SUGGESTED_TECHNOLOGIES.length} suggested technologies (hidden — enable the ones you use)`);
  }
  if ((await prisma.faq.count()) === 0) {
    const categories = [...new Set(SUGGESTED_FAQS.map((f) => f.category))];
    for (const [i, name] of categories.entries()) {
      const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const category = await prisma.faqCategory.upsert({ where: { slug }, create: { name, slug, displayOrder: i }, update: {} });
      await prisma.faq.createMany({
        data: SUGGESTED_FAQS.filter((f) => f.category === name).map((f, j) => ({ question: f.question, answer: f.answer, categoryId: category.id, displayOrder: j, isPublished: false })),
      });
    }
    log(`${SUGGESTED_FAQS.length} suggested FAQs (unpublished)`);
  }
}

// ------------------------------------------------------------------ demo only

const DEMO_USERS = [
  { email: 'admin@demo.asva.local', name: 'Demo Administrator', role: 'ADMINISTRATOR' },
  { email: 'editor@demo.asva.local', name: 'Demo Editor', role: 'EDITOR' },
  { email: 'sales@demo.asva.local', name: 'Demo Sales Manager', role: 'SALES_MANAGER' },
  { email: 'hr@demo.asva.local', name: 'Demo HR Manager', role: 'HR_MANAGER' },
] as const;

async function seedDemo() {
  const now = new Date();
  const published = { status: ContentStatus.PUBLISHED, publishedAt: now };

  await prisma.service.updateMany({ where: { status: ContentStatus.DRAFT }, data: published });
  await prisma.technology.updateMany({ where: { slug: { in: ['react', 'nextjs', 'typescript', 'tailwind-css', 'nodejs', 'nestjs', 'flutter', 'react-native', 'postgresql', 'redis', 'docker', 'aws', 'github-actions', 'figma', 'playwright', 'python'] } }, data: { isVisible: true } });
  await prisma.faq.updateMany({ data: { isPublished: true } });
  log('demo: published suggested services, FAQs and a set of technologies');

  await prisma.job.upsert({
    where: { slug: 'sample-frontend-developer' },
    create: {
      title: 'Sample: Frontend Developer (demo listing)',
      slug: 'sample-frontend-developer',
      department: 'Engineering',
      location: 'Pokhara, Nepal',
      employmentType: 'FULL_TIME',
      workplaceType: 'HYBRID',
      summary: 'Demonstration vacancy used to test the careers workflow. Not a real opening.',
      description: '<p><em>This is a sample vacancy for demonstration and testing only.</em></p><h2>Responsibilities</h2><ul><li>Build accessible, responsive interfaces</li><li>Collaborate with designers and backend engineers</li></ul>',
      status: JobStatus.OPEN,
      publishedAt: now,
    },
    update: {},
  });
  log('demo: 1 sample vacancy');

  const password = process.env.DEMO_USER_PASSWORD || `Demo-${randomBytes(9).toString('base64url')}-9!`;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  for (const user of DEMO_USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: user.role } });
    await prisma.adminUser.upsert({
      where: { email: user.email },
      create: { email: user.email, name: user.name, passwordHash, emailVerifiedAt: now, roles: { create: { roleId: role.id } } },
      update: { passwordHash, isActive: true, failedLoginAttempts: 0, lockedUntil: null },
    });
  }
  log(`demo users (${DEMO_USERS.map((u) => u.email).join(', ')})`);
  if (!process.env.DEMO_USER_PASSWORD) log(`demo user password (development only): ${password}`);
}

async function main() {
  console.log(`Seeding ${permissionsOnly ? 'permissions' : demo ? 'base + demo data' : 'base data'}…`);
  await seedPermissionsAndRoles();
  if (!permissionsOnly) {
    await seedSettings();
    await seedNavigation();
    await seedLegalPages();
    await seedSuggestedContent();
    if (demo) await seedDemo();
  }
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
