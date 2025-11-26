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
      synchronize: true, // Auto-create tables
      logging: process.env.NODE_ENV !== 'production',
    }),
    ScoresModule,
    IngestionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
