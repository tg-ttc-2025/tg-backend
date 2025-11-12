import { PartialType } from '@nestjs/mapped-types';
import { CreateDefenseDetectionDto } from './create-defense_detection.dto';

export class UpdateDefenseDetectionDto extends PartialType(CreateDefenseDetectionDto) {}