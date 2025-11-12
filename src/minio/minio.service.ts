import { Injectable, Logger } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketName: string;
  private minioHost: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET || 'tg-detections';
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

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`Bucket ${this.bucketName} created`);
        
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

  private getDirectPublicPath(filePath: string): string {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const port = process.env.MINIO_PORT ? `:${process.env.MINIO_PORT}` : '';
    
    return `${protocol}://${this.minioHost}${port}/${this.bucketName}/${filePath}`;
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    objId: string,
  ): Promise<{ path: string; fileName: string; publicUrl: string }> {
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
      const publicUrl = this.getDirectPublicPath(filePath);
      return { path: filePath, fileName, publicUrl }; 
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
    publicUrl: string
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

  async getFileUrl(filePath: string): Promise<string> {
    const useDirectPath = process.env.MINIO_RETURN_DIRECT_PATH === 'true';

    if (useDirectPath) {
        return this.getDirectPublicPath(filePath);
    }
    
    try {
      return await this.minioClient.presignedGetObject(this.bucketName, filePath, 60 * 60);
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error.message}`);
      throw error;
    }
  }
}