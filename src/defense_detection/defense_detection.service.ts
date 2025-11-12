// offense-detection.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MinioService } from '../minio/minio.service';
import { DetectionGateway } from './detection.gateway';
import { CreateOffenseDetectionDto } from './dto/create-defense_detection.dto';
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

  /**
   * 🫰 THANOS SNAP 🫰
   * Deletes a detection record and all associated images from both database and MinIO
   * @param id - The detection ID to delete
   * @returns Summary of deletion operation
   */
  async thanosSnap(id: string) {
    this.logger.warn(`🫰 Thanos snap initiated for detection ID: ${id}`);

    // Find the detection with its images
    const detection = await this.detectionRepo.findOne({
      where: { id },
      relations: ['images'],
    });

    if (!detection) {
      throw new NotFoundException(`Detection with ID ${id} not found`);
    }

    const deletionSummary = {
      detectionId: id,
      objId: detection.objId,
      imagesDeleted: 0,
      minioFilesDeleted: 0,
      errors: [] as string[],
    };

    // Delete images from MinIO first
    if (detection.images && detection.images.length > 0) {
      this.logger.log(`Deleting ${detection.images.length} files from MinIO...`);
      
      for (const image of detection.images) {
        try {
          await this.minioService.deleteFile(image.path);
          deletionSummary.minioFilesDeleted++;
          this.logger.log(`✅ Deleted from MinIO: ${image.path}`);
        } catch (error) {
          const errorMsg = `Failed to delete ${image.path} from MinIO: ${error.message}`;
          this.logger.error(errorMsg);
          deletionSummary.errors.push(errorMsg);
        }
      }

      // Delete image records from database
      try {
        await this.imageRepo.remove(detection.images);
        deletionSummary.imagesDeleted = detection.images.length;
        this.logger.log(`✅ Deleted ${detection.images.length} image records from database`);
      } catch (error) {
        const errorMsg = `Failed to delete image records: ${error.message}`;
        this.logger.error(errorMsg);
        deletionSummary.errors.push(errorMsg);
      }
    }

    // Delete the detection record from database
    try {
      await this.detectionRepo.remove(detection);
      this.logger.log(`✅ Deleted detection record ${id} from database`);
    } catch (error) {
      const errorMsg = `Failed to delete detection record: ${error.message}`;
      this.logger.error(errorMsg);
      deletionSummary.errors.push(errorMsg);
      throw error; // Re-throw as this is critical
    }

    this.logger.warn(
      `🫰 Thanos snap complete for detection ${id}: ` +
      `${deletionSummary.imagesDeleted} DB images, ` +
      `${deletionSummary.minioFilesDeleted} MinIO files deleted`
    );

    return deletionSummary;
  }

  /**
   * 🫰 THANOS SNAP BY OBJ ID 🫰
   * Deletes all detections with the given objId and their associated images
   * @param objId - The object ID to delete all detections for
   * @returns Summary of deletion operation
   */
  async thanosSnapByObjId(objId: string) {
    this.logger.warn(`🫰 Thanos snap by objId initiated for: ${objId}`);

    const detections = await this.detectionRepo.find({
      where: { objId },
      relations: ['images'],
    });

    if (detections.length === 0) {
      throw new NotFoundException(`No detections found for objId: ${objId}`);
    }

    const summary = {
      objId,
      detectionsDeleted: 0,
      totalImagesDeleted: 0,
      totalMinioFilesDeleted: 0,
      errors: [] as string[],
    };

    // Delete each detection
    for (const detection of detections) {
      try {
        const result = await this.thanosSnap(detection.id);
        summary.detectionsDeleted++;
        summary.totalImagesDeleted += result.imagesDeleted;
        summary.totalMinioFilesDeleted += result.minioFilesDeleted;
        summary.errors.push(...result.errors);
      } catch (error) {
        const errorMsg = `Failed to delete detection ${detection.id}: ${error.message}`;
        this.logger.error(errorMsg);
        summary.errors.push(errorMsg);
      }
    }

    this.logger.warn(
      `🫰 Thanos snap by objId complete for ${objId}: ` +
      `${summary.detectionsDeleted} detections, ` +
      `${summary.totalImagesDeleted} DB images, ` +
      `${summary.totalMinioFilesDeleted} MinIO files deleted`
    );

    return summary;
  }
}