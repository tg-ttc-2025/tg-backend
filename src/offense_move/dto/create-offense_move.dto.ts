import { IsString, IsNumber, IsOptional, IsBoolean, IsObject, IsInt } from 'class-validator';

export class CreateOffenseMoveDto {
  @IsString()
  codeName: string;

  @IsInt()
  groupId: number;

  @IsString()
  type: string;

  @IsString()
  objective: string;

  // Details
  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsNumber()
  @IsOptional()
  speed?: number;

  // Status
  @IsBoolean()
  @IsOptional()
  accNoising?: boolean;

  @IsBoolean()
  @IsOptional()
  angNoising?: boolean;

  @IsBoolean()
  @IsOptional()
  magNoising?: boolean;

  @IsBoolean()
  @IsOptional()
  gpsSpoofing?: boolean;

  @IsString()
  @IsOptional()
  target?: string;

  @IsString()
  @IsOptional()
  mission?: string;

  // Location
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  @IsOptional()
  alt?: number;

  // Position (orientation)
  @IsNumber()
  @IsOptional()
  rowAngle?: number;

  @IsNumber()
  @IsOptional()
  pitchAngle?: number;

  @IsNumber()
  @IsOptional()
  yawAngle?: number;
}