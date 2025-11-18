import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('offense_move')
export class OffenseMove {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'code_name', length: 100 })
  codeName: string;

  @Column({ name: 'group_id', type: 'integer' })
  groupId: number;

  @Column({ length: 50, default: 'drone' })
  type: string;

  @Column({ length: 100 })
  objective: string;

  // Details
  @Column({ length: 50, nullable: true })
  color: string;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  size: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  speed: number;

  // Status
  @Column({ name: 'acc_noising', default: false })
  accNoising: boolean;

  @Column({ name: 'ang_noising', default: false })
  angNoising: boolean;

  @Column({ name: 'mag_noising', default: false })
  magNoising: boolean;

  @Column({ name: 'gps_spoofing', default: false })
  gpsSpoofing: boolean;

  @Column({ length: 100, nullable: true })
  target: string;

  @Column({ length: 100, nullable: true })
  mission: string;

  // Location
  @Column('decimal', { precision: 10, scale: 8 })
  lat: number;

  @Column('decimal', { precision: 11, scale: 8 })
  lng: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  alt: number;

  // Position (orientation)
  @Column('decimal', { name: 'row_angle', precision: 10, scale: 4, nullable: true })
  rowAngle: number;

  @Column('decimal', { name: 'pitch_angle', precision: 10, scale: 4, nullable: true })
  pitchAngle: number;

  @Column('decimal', { name: 'yaw_angle', precision: 10, scale: 4, nullable: true })
  yawAngle: number;

  // Timestamps
  @Column('timestamp with time zone', { default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}