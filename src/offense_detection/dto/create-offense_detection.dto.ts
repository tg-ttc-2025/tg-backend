import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateOffenseDetectionDto {
  @IsString()
  objId: string;

  @IsString()
  type: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  @IsOptional()
  alt?: number;

  @IsString()
  @IsOptional()
  groundHeight?: string;

  @IsString()
  @IsOptional()
  objective?: string;

  @IsString()
  @IsOptional()
  size?: string;

  @IsObject()
  @IsOptional()
  details?: any;
}