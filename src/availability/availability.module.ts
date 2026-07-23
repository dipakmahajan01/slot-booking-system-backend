import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Availability } from './entities/availability.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Availability]), AuthModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
