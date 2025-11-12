import { OffenseDetection } from 'src/offense_detection/entities/offense_detection.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';

@Entity('offense_detection_images')
export class OffenseDetectionImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'offense_detection_id' })
  offenseDetectionId: string;

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

  @ManyToOne(() => OffenseDetection, detection => detection.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'offense_detection_id' })
  offenseDetection: OffenseDetection;
}