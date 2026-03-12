import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Athlete } from './athlete.entity';
import { Competition } from './competition.entity';

@Entity('dives')
export class Dive {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dive_code', length: 10 })
  diveCode: string;

  @Column({ length: 1, nullable: true })
  position: string; // A, B, C, D

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  difficulty: number;

  @Column({ name: 'judge_scores', type: 'simple-json', nullable: true })
  judgeScores: number[];  // Standardized: camelCase 'judgeScores' across all layers

  @Column({ name: 'final_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore: number;

  @Column({ name: 'cumulative_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  cumulativeScore: number;

  @Column({ type: 'int', nullable: true })
  rank: number;

  @Column({ name: 'round_number', type: 'int', default: 1 })
  roundNumber: number;

  @Column({ name: 'event_name', length: 255, nullable: true })
  eventName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Athlete, (athlete) => athlete.dives, { nullable: true })
  @JoinColumn({ name: 'athlete_id' })
  athlete: Athlete;

  @Column({ name: 'athlete_id', nullable: true })
  athleteId: number;

  @ManyToOne(() => Competition, (competition) => competition.dives, { nullable: true })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ name: 'competition_id', nullable: true })
  competitionId: number;
}
