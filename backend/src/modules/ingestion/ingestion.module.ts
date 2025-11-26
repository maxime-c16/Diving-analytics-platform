import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { Athlete } from '../../entities/athlete.entity';
import { Competition } from '../../entities/competition.entity';
import { Dive } from '../../entities/dive.entity';
import { IngestionLog } from '../../entities/ingestion-log.entity';
import { ScoresModule } from '../scores/scores.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Athlete, Competition, Dive, IngestionLog]),
    ScoresModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
