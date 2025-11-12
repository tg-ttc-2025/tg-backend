// offense-detection.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinioService } from '../minio/minio.service';
import { DetectionGateway } from './detection.gateway';
import { CreateOffenseDetectionDto } from './dto/create-offense_detection.dto';
import { OffenseDetectionImage } from './entities/offense_detection-image.entity';
import { OffenseDetection } from './entities/offense_detection.entity';

@Injectable()
export class OffenseDetectionService {
  private readonly logger = new Logger(OffenseDetectionService.name);

  constructor(
    @InjectRepository(OffenseDetection)
    private detectionRepo: Repository<OffenseDetection>,
    @InjectRepository(OffenseDetectionImage)
    private imageRepo: Repository<OffenseDetectionImage>,
    private minioService: MinioService,
    private detectionGateway: DetectionGateway,
  ) {}

  // NEW HELPER METHOD: Generates and attaches the public URL to each image object
  private async attachPublicUrls(detection: OffenseDetection): Promise<OffenseDetection> {
      if (detection.images && detection.images.length > 0) {
          const imagesWithUrl = await Promise.all(
              detection.images.map(async (image) => {
                  // Use the service to get the public or presigned URL based on config
                  const publicUrl = await this.minioService.getFileUrl(image.path);
                  
                  // Return a new object that includes the publicUrl
                  return {
                      ...image,
                      // Note: publicUrl is not a property on the Entity, 
                      // it's added dynamically for the response object.
                      publicUrl: publicUrl, 
                  };
              }),
          );
          // Overwrite the images array with the new objects containing the URL
          detection.images = imagesWithUrl as OffenseDetectionImage[];
      }
      return detection;
  }


  async create(
    dto: CreateOffenseDetectionDto,
    files: Express.Multer.File[],
  ) {
    // Always create new detection (for logging purposes)
    const detection = this.detectionRepo.create(dto);
    const savedDetection = await this.detectionRepo.save(detection);

    // Upload images if provided
    if (files && files.length > 0) {
      // NOTE: We rely on MinioService.uploadFiles to return the public path 
      // if configured, but we only store the internal path for database persistence.
      const uploadedFiles = await this.minioService.uploadFiles(
        files,
        'defense', // folder name
        dto.objId,
      );

      // Create image records
      const images = uploadedFiles.map((file, index) => {
        return this.imageRepo.create({
          offenseDetectionId: savedDetection.id,
          path: file.path, // <--- Only internal path is stored
          bucketName: 'tg-detections',
          fileName: file.fileName,
          fileSize: file.size,
          mimeType: file.mimeType,
          isPrimary: index === 0, // First image is primary
        });
      });

      await this.imageRepo.save(images);
    }

    // Load images for response
    let result = await this.detectionRepo.findOne({
      where: { id: savedDetection.id },
      relations: ['images'],
    });
    
    // ATTACH PUBLIC URLs HERE: Transform the result object
    result = await this.attachPublicUrls(result);

    // Send WebSocket update
    this.detectionGateway.sendDetectionUpdate(result);

    this.logger.log(`Detection created: ${dto.objId} (ID: ${result.id})`);
    return result;
  }

  // --- Other Methods (getHistory, getByObjId, getLatestByObjId) ---

  async getHistory(limit: number = 100, offset: number = 0) {
    const [detections, total] = await this.detectionRepo.findAndCount({
      relations: ['images'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
    
    // ATTACH PUBLIC URLs TO ALL DETECTIONS in the history
    const detectionsWithUrls = await Promise.all(detections.map(d => this.attachPublicUrls(d)));

    return {
      data: detectionsWithUrls,
      total,
      limit,
      offset,
    };
  }
  
  // Note: You should apply the same transformation to getByObjId and getLatestByObjId if 
  // those endpoints are also consumed by the frontend.

  async getLatestByObjId(objId: string) {
    // Get only the latest detection with this objId
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
    // Get all detections with this objId (for logging)
    const results = await this.detectionRepo.find({
      where: { objId },
      relations: ['images'],
      order: { timestamp: 'DESC' },
    });
    
    const resultsWithUrls = await Promise.all(results.map(r => this.attachPublicUrls(r)));
    return resultsWithUrls;
  }
}