import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DetectionGateway } from './detection.gateway';
import { MinioModule } from '../minio/minio.module';
import { DefenseDetectionImage } from './entities/defense_detection-image.entity';
import { DefenseDetection } from './entities/defense_detection.entity';
import { DefenseDetectionService } from './defense_detection.service';
import { DefenseDetectionController } from './defense_detection.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DefenseDetection, DefenseDetectionImage]),
    MinioModule,
  ],
  controllers: [DefenseDetectionController],
  providers: [DefenseDetectionService, DetectionGateway],
})
export class DefenseDetectionModule {}