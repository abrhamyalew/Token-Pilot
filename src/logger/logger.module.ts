import { Module } from '@nestjs/common';
import { RequestLoggerService } from './logger.service';
import { CostCalculatorService } from './cost-calculator.service';

@Module({
  providers: [RequestLoggerService, CostCalculatorService],
  exports: [RequestLoggerService, CostCalculatorService],
})
export class LoggerModule {}
