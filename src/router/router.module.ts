import { Module } from '@nestjs/common';
import { RouterController } from './router.controller';
import { RouterService } from './router.service';
import { ClassifierModule } from '../classifier/classifier.module';
import { ProvidersModule } from '../providers/providers.module';
import { LoggerModule } from '../logger/logger.module';
import { RateLimiterModule } from '../rate-limiter/rate-limiter.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ClassifierModule, ProvidersModule, LoggerModule, RateLimiterModule, AuthModule],
  controllers: [RouterController],
  providers: [RouterService],
})
export class RouterModule {}
