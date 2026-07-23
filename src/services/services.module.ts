import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { Availability } from '../availability/entities/availability.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Service, Availability]), AuthModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule { }
