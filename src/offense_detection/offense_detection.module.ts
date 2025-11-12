import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DetectionGateway } from './detection.gateway';
import { MinioModule } from '../minio/minio.module';
import { OffenseDetectionImage } from './entities/offense_detection-image.entity';
import { OffenseDetection } from './entities/offense_detection.entity';
import { OffenseDetectionController } from './offense_detection.controller';
import { OffenseDetectionService } from './offense_detection.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OffenseDetection, OffenseDetectionImage]),
    MinioModule,
  ],
  controllers: [OffenseDetectionController],
  providers: [OffenseDetectionService, DetectionGateway],
})
export class OffenseDetectionModule {}