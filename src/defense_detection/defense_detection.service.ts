// defense-detection.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinioService } from '../minio/minio.service';
import { DetectionGateway } from './detection.gateway';
import { CreateDefenseDetectionDto } from './dto/create-defense_detection.dto';
import { DefenseDetectionImage } from './entities/defense_detection-image.entity';
import { DefenseDetection } from './entities/defense_detection.entity';


@Injectable()
export class DefenseDetectionService {
  private readonly logger = new Logger(DefenseDetectionService.name);

  constructor(
    @InjectRepository(DefenseDetection)
    private detectionRepo: Repository<DefenseDetection>,
    @InjectRepository(DefenseDetectionImage)
    private imageRepo: Repository<DefenseDetectionImage>,
    private minioService: MinioService,
    private detectionGateway: DetectionGateway,
  ) {}


  private async attachPublicUrls(detection: DefenseDetection): Promise<DefenseDetection> {
      if (detection.images && detection.images.length > 0) {
          const imagesWithUrl = await Promise.all(
              detection.images.map(async (image) => {
                  const publicUrl = await this.minioService.getFileUrl(image.path);
                  
                  return {
                      ...image,
                      publicUrl: publicUrl, 
                  };
              }),
          );
          detection.images = imagesWithUrl as DefenseDetectionImage[];
      }
      return detection;
  }


  async create(
    dto: CreateDefenseDetectionDto,
    files: Express.Multer.File[],
  ) {
    const detection = this.detectionRepo.create(dto);
    const savedDetection = await this.detectionRepo.save(detection);

    if (files && files.length > 0) {
      const uploadedFiles = await this.minioService.uploadFiles(
        files,
        'defense', 
        dto.objId,
      );

      const images = uploadedFiles.map((file, index) => {
        return this.imageRepo.create({
          defenseDetectionId: savedDetection.id,
          path: file.path,
          bucketName: 'tg-detections',
          fileName: file.fileName,
          fileSize: file.size,
          mimeType: file.mimeType,
          isPrimary: index === 0,
        });
      });

      await this.imageRepo.save(images);
    }

    let result = await this.detectionRepo.findOne({
      where: { id: savedDetection.id },
      relations: ['images'],
    });
    
    result = await this.attachPublicUrls(result);

    this.detectionGateway.sendDetectionUpdate(result);

    this.logger.log(`Detection created: ${dto.objId} (ID: ${result.id})`);
    return result;
  }

  async getHistory(limit: number = 100, offset: number = 0) {
    const [detections, total] = await this.detectionRepo.findAndCount({
      relations: ['images'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
    
    const detectionsWithUrls = await Promise.all(detections.map(d => this.attachPublicUrls(d)));

    return {
      data: detectionsWithUrls,
      total,
      limit,
      offset,
    };
  }
  
  async getLatestByObjId(objId: string) {
    let result = await this.detectionRepo.findOne({
      where: { objId },
      relations: ['images'],
      order: { timestamp: 'DESC' },
    });
    
    if (result) {
        result = await this.attachPublicUrls(result);
    }
    return result;
  }
  
  async getByObjId(objId: string) {
    const results = await this.detectionRepo.find({
      where: { objId },
      relations: ['images'],
      order: { timestamp: 'DESC' },
    });
    
    const resultsWithUrls = await Promise.all(results.map(r => this.attachPublicUrls(r)));
    return resultsWithUrls;
  }
}