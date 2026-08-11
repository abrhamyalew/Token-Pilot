import { Module, Global, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE_TOKEN = 'DATABASE';
export const DATABASE_CLIENT_TOKEN = 'DATABASE_CLIENT';

export type Database = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CLIENT_TOKEN,
      useFactory: (config: ConfigService): postgres.Sql => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        return postgres(connectionString, {
          max: 5,
          idle_timeout: 20,
          connect_timeout: 10,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: DATABASE_TOKEN,
      useFactory: (client: postgres.Sql): Database => {
        return drizzle(client, { schema });
      },
      inject: [DATABASE_CLIENT_TOKEN],
    },
  ],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(DATABASE_CLIENT_TOKEN) private readonly client: postgres.Sql,
  ) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing database connection pool...');
    try {
      await this.client.end({ timeout: 5 });
      this.logger.log('Database connection pool closed');
    } catch (error) {
      this.logger.error('Error closing database connection', error);
    }
  }
}
