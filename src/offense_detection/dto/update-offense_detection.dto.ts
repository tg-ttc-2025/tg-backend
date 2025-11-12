import { PartialType } from '@nestjs/mapped-types';
import { CreateOffenseDetectionDto } from './create-offense_detection.dto';

export class UpdateOffenseDetectionDto extends PartialType(CreateOffenseDetectionDto) {}
