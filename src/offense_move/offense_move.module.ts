import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OffenseMoveGateway } from './offense-move.gateway';
import { OffenseMove } from './entities/offense_move.entity';
import { OffenseMoveService } from './offense_move.service';
import { OffenseMoveController } from './offense_move.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([OffenseMove]),
  ],
  controllers: [OffenseMoveController],
  providers: [OffenseMoveService, OffenseMoveGateway],
  exports: [OffenseMoveService, OffenseMoveGateway],
})
export class OffenseMoveModule {}