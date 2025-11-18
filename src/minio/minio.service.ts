import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private minioHost: string; // Store host for public URL construction

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET || 'tg-detections';
    // Store Minio endpoint details
    this.minioHost = process.env.MINIO_ENDPOINT || 'localhost';
    const minioPort = parseInt(process.env.MINIO_PORT) || 9000;
    const useSSL = process.env.MINIO_USE_SSL === 'true';

    this.minioClient = new Minio.Client({
      endPoint: this.minioHost,
      port: minioPort,
      useSSL: useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    });

    this.ensureBucket();
  }
// ... (ensureBucket remains the same)

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created`);
        
        // OPTIONAL: Set public read policy on creation
        const policy = JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`]
            }
          ]
        });
        await this.minioClient.setBucketPolicy(this.bucketName, policy);
        this.logger.log(`Public read policy set for bucket ${this.bucketName}`);
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket: ${error.message}`);
    }
  }

  // New method to construct the direct public path
  private getDirectPublicPath(filePath: string): string {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
    
    // Assumes Minio is configured for virtual-host style or path style access.
    // This uses the path style: http(s)://endpoint:port/bucketName/filePath
    return `${protocol}://${this.minioHost}${port}/${this.bucketName}/${filePath}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    objId: string,
  ): Promise<{ path: string; fileName: string; publicUrl: string }> { // Added publicUrl
    const timestamp = Date.now();
    const fileName = `${objId}-${timestamp}-${file.originalname}`;
    const filePath = `${folder}/${fileName}`;

    try {
      await this.minioClient.putObject(
        this.bucketName,
        filePath,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      );

      this.logger.log(`File uploaded: ${filePath}`);
      const publicUrl = this.getDirectPublicPath(filePath); // Construct public URL
      return { path: filePath, fileName, publicUrl }; // Return publicUrl
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw error;
    }
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
    objId: string,
  ): Promise<Array<{ 
    path: string; 
    fileName: string; 
    size: number; 
    mimeType: string; 
    publicUrl: string // Added publicUrl
  }>> {
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadFile(file, folder, objId);
      return {
        ...result,
        size: file.size,
        mimeType: file.mimetype,
      };
    });

    return Promise.all(uploadPromises);
  }

  // Changed getFileUrl to optionally return the public path
  async getFileUrl(filePath: string): Promise<string> {
    const useDirectPath = process.env.MINIO_RETURN_DIRECT_PATH === 'true';

    if (useDirectPath) {
        return this.getDirectPublicPath(filePath);
    }
    
    try {
      // Default behavior: return presigned URL
      return await this.minioClient.presignedGetObject(this.bucketName, filePath, 60 * 60);
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error.message}`);
      throw error;
    }
  }

  // Add this method to your MinioService class

async deleteFile(filePath: string): Promise<void> {
  try {
    await this.minioClient.removeObject(this.bucketName, filePath);
    this.logger.log(`File deleted from MinIO: ${filePath}`);
  } catch (error) {
    this.logger.error(`Failed to delete file ${filePath}: ${error.message}`);
    throw error;
  }
}

// BONUS: Delete multiple files at once (more efficient for Thanos Snap)
async deleteFiles(filePaths: string[]): Promise<void> {
  if (!filePaths || filePaths.length === 0) {
    return;
  }

  try {
    // MinIO supports batch deletion with removeObjects
    const objectsList = filePaths.map(path => path);
    await this.minioClient.removeObjects(this.bucketName, objectsList);
    this.logger.log(`Batch deleted ${filePaths.length} files from MinIO`);
  } catch (error) {
    this.logger.error(`Failed to batch delete files: ${error.message}`);
    throw error;
  }
}
}