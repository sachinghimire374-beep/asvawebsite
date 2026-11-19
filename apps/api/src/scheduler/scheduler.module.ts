import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service.js';

/** Scheduled publishing for pages and services. */
@Module({
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
