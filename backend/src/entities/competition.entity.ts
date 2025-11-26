import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Dive } from './dive.entity';
import { IngestionLog } from './ingestion-log.entity';

@Entity('competitions')
export class Competition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'date', nullable: true })
  date: Date;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ name: 'event_type', length: 50, nullable: true })
  eventType: string; // '1m', '3m', '5m', '7.5m', '10m'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Dive, (dive) => dive.competition)
  dives: Dive[];

  @OneToMany(() => IngestionLog, (log) => log.competition)
  ingestionLogs: IngestionLog[];
}
