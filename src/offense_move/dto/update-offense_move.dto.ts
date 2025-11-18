import { PartialType } from '@nestjs/mapped-types';
import { CreateOffenseMoveDto } from './create-offense_move.dto';

export class UpdateOffenseMoveDto extends PartialType(CreateOffenseMoveDto) {}
