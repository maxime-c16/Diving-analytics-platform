import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScoresModule } from "./modules/scores/scores.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { Athlete } from "./entities/athlete.entity";
import { Competition } from "./entities/competition.entity";
import { Dive } from "./entities/dive.entity";
import { IngestionLog } from "./entities/ingestion-log.entity";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'mariadb',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      username: process.env.DB_USER || 'diver',
      password: process.env.DB_PASSWORD || 'divepassword',
      database: process.env.DB_NAME || 'diving_db',
      entities: [Athlete, Competition, Dive, IngestionLog],
      synchronize: false, // Disabled - use migrations instead to prevent data loss
      logging: process.env.NODE_ENV !== 'production',
      // Improve robustness for CI/local flaky DB connections
      retryAttempts: 10,
      retryDelay: 3000,
      extra: {
        // Connection pool size
        connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '50', 10),
        // Wait for connections rather than erroring out immediately
        waitForConnections: true,
        // Driver-level connect timeout (ms)
        connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '30000', 10),
        // Queue limit for waiting connection requests (0 = unlimited)
        queueLimit: 0,
      },
    }),
    ScoresModule,
    IngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
