import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFiles,
  Query,
  BadRequestException,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DefenseDetectionService } from './defense_detection.service';
import { CreateDefenseDetectionDto } from './dto/create-defense_detection.dto';

@Controller('ttc/api/defense')
export class DefenseDetectionController {
  constructor(private readonly service: DefenseDetectionService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      // Parse JSON fields if they come as strings from form-data
      const dto: CreateDefenseDetectionDto = {
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

  @Delete('by-obj-id/:objId')
  @HttpCode(HttpStatus.OK)
  async thanosSnapByObjId(@Param('objId') objId: string) {
    if (!objId) {
      throw new BadRequestException('objId is required');
    }
    return await this.service.thanosSnapByObjId(objId);
  }
}