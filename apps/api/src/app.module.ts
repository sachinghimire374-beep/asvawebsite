import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { loadEnv } from './config/env.js';
import { EnvModule } from './config/env.module.js';
import { CoreModule } from './core.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditController } from './audit/audit.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard, CsrfGuard, PermissionsGuard } from './auth/guards.js';
import { CareersModule } from './careers/careers.module.js';
import { AllExceptionsFilter } from './common/exception.filter.js';
import { ResponseEnvelopeInterceptor } from './common/http.js';
import { ZodValidationPipe } from './common/zod.js';
import { ContactModule } from './contact/contact.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { FaqsModule } from './faqs/faqs.js';
import { HealthModule } from './health/health.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { MediaController } from './media/media.controller.js';
import { NavigationModule } from './navigation/navigation.js';
import { NewsletterModule } from './newsletter/newsletter.module.js';
import { PagesController } from './pages/pages.controller.js';
import { PagesService } from './pages/pages.service.js';
import { RedirectsController } from './redirects/redirects.controller.js';
import { RetentionService } from './retention/retention.service.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';
import { SeoModule } from './seo/seo.module.js';
import { ServicesController } from './services/services.controller.js';
import { ServicesService } from './services/services.service.js';
import { SettingsController } from './settings/settings.controller.js';
import { TeamModule } from './team/team.js';
import { TechnologiesModule } from './technologies/technologies.js';
import { TestimonialsModule } from './testimonials/testimonials.js';
import { RolesController } from './users/roles.controller.js';
import { UsersController } from './users/users.controller.js';
import { UsersService } from './users/users.service.js';

const env = loadEnv();

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: { paths: ['req.headers.cookie', 'req.headers.authorization', 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]'], censor: '[redacted]' },
        serializers: { req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }) },
        autoLogging: { ignore: (req) => Boolean(req.url?.includes('/health/')) },
        transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { singleLine: true, translateTime: 'HH:MM:ss' } } : undefined,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
      // Test suites log in many times from one IP; a dedicated test re-enables throttling to verify it.
      skipIf: () => env.NODE_ENV === 'test' && process.env.THROTTLE_IN_TESTS !== 'true',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CoreModule,
    SchedulerModule,
    TechnologiesModule,
    TestimonialsModule,
    FaqsModule,
    TeamModule,
    NavigationModule,
    ContactModule,
    InquiriesModule,
    CareersModule,
    NewsletterModule,
    DashboardModule,
    SeoModule,
    HealthModule,
  ],
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    AuditController,
    SettingsController,
    MediaController,
    RedirectsController,
    PagesController,
    ServicesController,
  ],
  providers: [
    UsersService,
    PagesService,
    ServicesService,
    RetentionService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
