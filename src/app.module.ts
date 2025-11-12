import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MinioModule } from './minio/minio.module';
import { DefenseDetectionModule } from './defense_detection/defense_detection.module';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'tg_user',
      password: process.env.DB_PASSWORD || 'tg_password',
      database: process.env.DB_NAME || 'tg_postgres',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // Set to false in production
    }),
    DefenseDetectionModule,
    MinioModule,
  ],
})
export class AppModule {}