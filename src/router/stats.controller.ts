/**
 * Stats Controller — read-only dashboard data endpoints.
 *
 * GET /api/stats/summary        → aggregate totals
 * GET /api/stats/recent?limit=N → most recent N requests (max 100)
 * GET /api/stats/timeseries?days=N → daily rollup for last N days (max 90)
 *
 * No API key required — returns aggregate data only, no user PII in
 * the summary/timeseries endpoints. recent includes prompt text for
 * the dashboard table, which is acceptable per the consent banner.
 */

import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { StatsQueryService } from '../logger/stats-query.service';

@Controller('api/stats')
export class StatsController {
  constructor(private readonly stats: StatsQueryService) {}

  @Get('summary')
  async summary() {
    return this.stats.getSummary();
  }

  @Get('recent')
  async recent(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.stats.getRecent(limit);
  }

  @Get('timeseries')
  async timeseries(
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    return this.stats.getTimeseries(days);
  }
}
