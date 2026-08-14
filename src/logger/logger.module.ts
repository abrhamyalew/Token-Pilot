import { Module } from '@nestjs/common';
import { RequestLoggerService } from './logger.service';
import { CostCalculatorService } from './cost-calculator.service';
import { StatsQueryService } from './stats-query.service';

@Module({
  providers: [RequestLoggerService, CostCalculatorService, StatsQueryService],
  exports: [RequestLoggerService, CostCalculatorService, StatsQueryService],
})
export class LoggerModule {}
