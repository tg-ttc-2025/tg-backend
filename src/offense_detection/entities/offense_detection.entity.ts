import { OffenseDetectionImage } from 'src/offense_detection/entities/offense_detection-image.entity';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';


@Entity('offense_detections')
export class OffenseDetection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'obj_id', length: 100 })
  objId: string;

  @Column({ length: 50 })
  type: string;

  @Column('decimal', { precision: 10, scale: 8 })
  lat: number;

  @Column('decimal', { precision: 11, scale: 8 })
  lng: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  alt: number;

  @Column({ name: 'ground_height', length: 50, nullable: true })
  groundHeight: string;

  @Column({ length: 100, nullable: true })
  objective: string;

  @Column({ length: 50, nullable: true })
  size: string;

  @Column('jsonb', { default: {} })
  details: any;

  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => OffenseDetectionImage, image => image.offenseDetection, { cascade: true })
  images: OffenseDetectionImage[];
}