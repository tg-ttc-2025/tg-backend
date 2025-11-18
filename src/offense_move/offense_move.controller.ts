import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  Delete,
  HttpCode,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { CreateOffenseMoveDto } from './dto/create-offense_move.dto';
import { OffenseMoveService } from './offense_move.service';


@Controller('ttc/api/offense-move')
export class OffenseMoveController {
  constructor(private readonly service: OffenseMoveService) {}

  // Create single offense move
  @Post()
  async create(@Body() body: any) {
    try {
      const dto: CreateOffenseMoveDto = {
        codeName: body.codeName || body.code_name,
        groupId: parseInt(body.groupId || body.group_id || body.group),
        type: body.type || 'drone',
        objective: body.objective,
        color: body.color || body.details?.color,
        size: body.size ? parseFloat(body.size) : body.details?.size ? parseFloat(body.details.size) : undefined,
        speed: body.speed ? parseFloat(body.speed) : body.details?.speed ? parseFloat(body.details.speed) : undefined,
        accNoising: body.accNoising || body.acc_noising || body.status?.['acc noising'] || false,
        angNoising: body.angNoising || body.ang_noising || body.status?.['ang noising'] || false,
        magNoising: body.magNoising || body.mag_noising || body.status?.['mag noising'] || false,
        gpsSpoofing: body.gpsSpoofing || body.gps_spoofing || body.status?.['gps spoofing'] || false,
        target: body.target || body.status?.target,
        mission: body.mission || body.status?.mission,
        lat: parseFloat(body.lat || body.location?.lat),
        lng: parseFloat(body.lng || body.location?.lng),
        alt: body.alt ? parseFloat(body.alt) : body.location?.alt ? parseFloat(body.location.alt) : undefined,
        rowAngle: body.rowAngle || body.row_angle || body.position?.row ? parseFloat(body.position.row) : undefined,
        pitchAngle: body.pitchAngle || body.pitch_angle || body.position?.pitch ? parseFloat(body.position.pitch) : undefined,
        yawAngle: body.yawAngle || body.yaw_angle || body.position?.yaw ? parseFloat(body.position.yaw) : undefined,
      };

      return await this.service.create(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Create multiple offense moves (batch)
  @Post('batch')
  async createBatch(@Body() body: { data: any[] }) {
    try {
      if (!body.data || !Array.isArray(body.data)) {
        throw new BadRequestException('Request body must contain a "data" array');
      }

      const dtos: CreateOffenseMoveDto[] = body.data.map((item) => ({
        codeName: item.codeName || item.code_name,
        groupId: parseInt(item.groupId || item.group_id || item.group),
        type: item.type || 'drone',
        objective: item.objective,
        color: item.color || item.details?.color,
        size: item.size ? parseFloat(item.size) : item.details?.size ? parseFloat(item.details.size) : undefined,
        speed: item.speed ? parseFloat(item.speed) : item.details?.speed ? parseFloat(item.details.speed) : undefined,
        accNoising: item.accNoising || item.acc_noising || item.status?.['acc noising'] || false,
        angNoising: item.angNoising || item.ang_noising || item.status?.['ang noising'] || false,
        magNoising: item.magNoising || item.mag_noising || item.status?.['mag noising'] || false,
        gpsSpoofing: item.gpsSpoofing || item.gps_spoofing || item.status?.['gps spoofing'] || false,
        target: item.target || item.status?.target,
        mission: item.mission || item.status?.mission,
        lat: parseFloat(item.lat || item.location?.lat),
        lng: parseFloat(item.lng || item.location?.lng),
        alt: item.alt ? parseFloat(item.alt) : item.location?.alt ? parseFloat(item.location.alt) : undefined,
        rowAngle: item.rowAngle || item.row_angle || item.position?.row ? parseFloat(item.position.row) : undefined,
        pitchAngle: item.pitchAngle || item.pitch_angle || item.position?.pitch ? parseFloat(item.position.pitch) : undefined,
        yawAngle: item.yawAngle || item.yaw_angle || item.position?.yaw ? parseFloat(item.position.yaw) : undefined,
      }));

      return await this.service.createBatch(dtos);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Get history with pagination
  @Get('history')
  async getHistory(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 100;
    const offsetNum = offset ? parseInt(offset) : 0;
    return await this.service.getHistory(limitNum, offsetNum);
  }

  // Get by code name
  @Get('by-code-name')
  async getByCodeName(@Query('codeName') codeName: string) {
    if (!codeName) {
      throw new BadRequestException('codeName is required');
    }
    return await this.service.getByCodeName(codeName);
  }

  // Get latest by code name
  @Get('latest-by-code-name')
  async getLatestByCodeName(@Query('codeName') codeName: string) {
    if (!codeName) {
      throw new BadRequestException('codeName is required');
    }
    return await this.service.getLatestByCodeName(codeName);
  }

  // Get by group ID
  @Get('by-group')
  async getByGroupId(@Query('groupId') groupId: string) {
    if (!groupId) {
      throw new BadRequestException('groupId is required');
    }
    return await this.service.getByGroupId(parseInt(groupId));
  }

  // Get latest moves for all drones
  @Get('latest')
  async getLatestMoves() {
    return await this.service.getLatestMoves();
  }

  // Get active drones (last 5 minutes)
  @Get('active')
  async getActiveDrones() {
    return await this.service.getActiveDrones();
  }

  // Get by objective
  @Get('by-objective')
  async getByObjective(@Query('objective') objective: string) {
    if (!objective) {
      throw new BadRequestException('objective is required');
    }
    return await this.service.getByObjective(objective);
  }

  // Get by mission
  @Get('by-mission')
  async getByMission(@Query('mission') mission: string) {
    if (!mission) {
      throw new BadRequestException('mission is required');
    }
    return await this.service.getByMission(mission);
  }

  // Get by time range
  @Get('by-time-range')
  async getByTimeRange(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    if (!startTime || !endTime) {
      throw new BadRequestException('startTime and endTime are required');
    }
    return await this.service.getByTimeRange(new Date(startTime), new Date(endTime));
  }

  // Get statistics
  @Get('statistics')
  async getStatistics() {
    return await this.service.getStatistics();
  }

  @Delete('by-code-name/:codeName')
@HttpCode(HttpStatus.OK)
async thanosSnapByCodeName(@Param('codeName') codeName: string) {
  if (!codeName) {
    throw new BadRequestException('codeName is required');
  }
  return await this.service.thanosSnapByCodeName(codeName);
}
}