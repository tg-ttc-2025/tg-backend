import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OffenseMoveGateway } from './offense-move.gateway';
import { OffenseMove } from './entities/offense_move.entity';
import { CreateOffenseMoveDto } from './dto/create-offense_move.dto';

@Injectable()
export class OffenseMoveService {
  private readonly logger = new Logger(OffenseMoveService.name);

  constructor(
    @InjectRepository(OffenseMove)
    private offenseMoveRepo: Repository<OffenseMove>,
    private offenseMoveGateway: OffenseMoveGateway,
  ) {}

  async create(dto: CreateOffenseMoveDto) {
    const offenseMove = this.offenseMoveRepo.create(dto);
    const savedOffenseMove = await this.offenseMoveRepo.save(offenseMove);

    this.offenseMoveGateway.sendOffenseMoveUpdate(savedOffenseMove);

    this.logger.log(`Offense move created: ${dto.codeName} (ID: ${savedOffenseMove.id})`);
    return savedOffenseMove;
  }

  async createBatch(dtos: CreateOffenseMoveDto[]) {
    const offenseMoves = this.offenseMoveRepo.create(dtos);
    const savedOffenseMoves = await this.offenseMoveRepo.save(offenseMoves);

    this.offenseMoveGateway.sendBatchOffenseMoveUpdate(savedOffenseMoves);

    this.logger.log(`Batch offense moves created: ${savedOffenseMoves.length} items`);
    return savedOffenseMoves;
  }

  async getHistory(limit: number = 100, offset: number = 0) {
    const [offenseMoves, total] = await this.offenseMoveRepo.findAndCount({
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      data: offenseMoves,
      total,
      limit,
      offset,
    };
  }

  async getByCodeName(codeName: string) {
    const offenseMoves = await this.offenseMoveRepo.find({
      where: { codeName },
      order: { timestamp: 'DESC' },
    });

    return offenseMoves;
  }

  async getLatestByCodeName(codeName: string) {
    const offenseMove = await this.offenseMoveRepo.findOne({
      where: { codeName },
      order: { timestamp: 'DESC' },
    });

    return offenseMove;
  }

  async getByGroupId(groupId: number) {
    const offenseMoves = await this.offenseMoveRepo.find({
      where: { groupId },
      order: { timestamp: 'DESC' },
    });

    return offenseMoves;
  }

  async getLatestMoves() {
    const query = `
      SELECT DISTINCT ON (code_name) *
      FROM offense_move
      ORDER BY code_name, timestamp DESC
    `;
    
    const offenseMoves = await this.offenseMoveRepo.query(query);
    return offenseMoves;
  }

  async getActiveDrones() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const query = `
      SELECT DISTINCT ON (code_name) *
      FROM offense_move
      WHERE timestamp > $1
      ORDER BY code_name, timestamp DESC
    `;
    
    const activeDrones = await this.offenseMoveRepo.query(query, [fiveMinutesAgo]);
    
    this.offenseMoveGateway.sendActiveOffenseMoves(activeDrones);
    
    return activeDrones;
  }

  async getByObjective(objective: string) {
    const offenseMoves = await this.offenseMoveRepo.find({
      where: { objective },
      order: { timestamp: 'DESC' },
    });

    return offenseMoves;
  }

  async getByTimeRange(startTime: Date, endTime: Date) {
    const offenseMoves = await this.offenseMoveRepo
      .createQueryBuilder('offense_move')
      .where('offense_move.timestamp BETWEEN :startTime AND :endTime', {
        startTime,
        endTime,
      })
      .orderBy('offense_move.timestamp', 'DESC')
      .getMany();

    return offenseMoves;
  }

  async getByMission(mission: string) {
    const offenseMoves = await this.offenseMoveRepo.find({
      where: { mission },
      order: { timestamp: 'DESC' },
    });

    return offenseMoves;
  }

  async getStatistics() {
    const total = await this.offenseMoveRepo.count();
    
    const byObjective = await this.offenseMoveRepo
      .createQueryBuilder('offense_move')
      .select('offense_move.objective', 'objective')
      .addSelect('COUNT(*)', 'count')
      .groupBy('offense_move.objective')
      .getRawMany();

    const byType = await this.offenseMoveRepo
      .createQueryBuilder('offense_move')
      .select('offense_move.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('offense_move.type')
      .getRawMany();

    const uniqueDrones = await this.offenseMoveRepo
      .createQueryBuilder('offense_move')
      .select('COUNT(DISTINCT offense_move.code_name)', 'count')
      .getRawOne();

    return {
      total,
      uniqueDrones: parseInt(uniqueDrones.count),
      byObjective,
      byType,
    };
  }

async thanosSnapByCodeName(codeName: string) {
  this.logger.log(`Initiating Thanos Snap for codeName: ${codeName}`);

  const offenseMoves = await this.offenseMoveRepo.find({
    where: { codeName },
  });

  if (!offenseMoves || offenseMoves.length === 0) {
    this.logger.warn(`No offense moves found for codeName: ${codeName}`);
    return {
      success: true,
      message: 'No offense moves found to delete',
      deletedCount: 0,
    };
  }

  try {
    await this.offenseMoveRepo.remove(offenseMoves);

    this.logger.log(
      `Thanos Snap completed for codeName: ${codeName} - Deleted ${offenseMoves.length} offense moves`,
    );

    this.offenseMoveGateway.sendOffenseMoveDeleted(codeName);

    return {
      success: true,
      message: `Successfully deleted all offense moves for codeName: ${codeName}`,
      deletedCount: offenseMoves.length,
    };
  } catch (error) {
    this.logger.error(`Thanos Snap failed for codeName: ${codeName}: ${error.message}`);
    throw new BadRequestException(`Failed to delete offense moves: ${error.message}`);
  }
}
}