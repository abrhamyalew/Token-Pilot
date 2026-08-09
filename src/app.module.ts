import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RouterModule } from './router/router.module';

@Module({
  imports: [
    // Load .env file and make ConfigService available globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Global database connection (Supabase Postgres)
    DatabaseModule,

    // Feature modules (classifier, providers, logger, rate-limiter are
    // imported transitively through RouterModule)
    RouterModule,
  ],
})
export class AppModule {}
