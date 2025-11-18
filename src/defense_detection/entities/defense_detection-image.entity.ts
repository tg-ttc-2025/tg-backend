
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { DefenseDetection } from './defense_detection.entity';

@Entity('defense_detection_images')
export class DefenseDetectionImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'defense_detection_id' })
  defenseDetectionId: string;

  @Column('text')
  path: string;

  @Column({ name: 'bucket_name', length: 100, default: 'tg-detections' })
  bucketName: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column('bigint', { name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string;

  @CreateDateColumn({ name: 'upload_timestamp' })
  uploadTimestamp: Date;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @ManyToOne(() => DefenseDetection, detection => detection.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'defense_detection_id' })
  defenseDetection: DefenseDetection;
}