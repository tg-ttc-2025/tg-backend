import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OffenseDetectionService } from './offense_detection.service';
import { CreateOffenseDetectionDto } from './dto/create-offense_detection.dto';

@Controller('ttc/api/offense')
export class OffenseDetectionController {
  constructor(private readonly service: OffenseDetectionService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10)) // Max 10 images
  async create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      // Parse JSON fields if they come as strings from form-data
      const dto: CreateOffenseDetectionDto = {
        objId: body.objId,
        type: body.type,
        lat: parseFloat(body.lat),
        lng: parseFloat(body.lng),
        alt: body.alt ? parseFloat(body.alt) : undefined,
        groundHeight: body.groundHeight,
        objective: body.objective,
        size: body.size,
        details: body.details ? JSON.parse(body.details) : {},
      };

      return await this.service.create(dto, files);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('history')
  async getHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;
    return await this.service.getHistory(limitNum, offsetNum);
  }

  @Get('by-obj-id')
  async getByObjId(@Query('objId') objId: string) {
    if (!objId) {
      throw new BadRequestException('objId is required');
    }
    return await this.service.getByObjId(objId);
  }

  @Get('latest-by-obj-id')
  async getLatestByObjId(@Query('objId') objId: string) {
    if (!objId) {
      throw new BadRequestException('objId is required');
    }
    return await this.service.getLatestByObjId(objId);
  }
}