import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Competition } from './competition.entity';

export enum IngestionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum IngestionFileType {
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json',
}

@Entity('ingestion_logs')
export class IngestionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_type', type: 'enum', enum: IngestionFileType })
  fileType: IngestionFileType;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({
    type: 'enum',
    enum: IngestionStatus,
    default: IngestionStatus.PENDING,
  })
  status: IngestionStatus;

  @Column({ name: 'total_rows', type: 'int', default: 0 })
  totalRows: number;

  @Column({ name: 'processed_rows', type: 'int', default: 0 })
  processedRows: number;

  @Column({ name: 'failed_rows', type: 'int', default: 0 })
  failedRows: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'error_details', type: 'json', nullable: true })
  errorDetails: object;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ name: 'confidence', type: 'float', nullable: true })
  confidence: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Competition, (competition) => competition.ingestionLogs, { nullable: true })
  @JoinColumn({ name: 'competition_id' })
  competition: Competition;

  @Column({ name: 'competition_id', nullable: true })
  competitionId: number;
}
