import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Availability, DayOfWeek } from './entities/availability.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) { }

  private assertValidTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
  }

  private async assertNoOverlap(
    ownerId: string,
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ) {
    const slotsOnDay = await this.availabilityRepository.find({
      where: { ownerId, dayOfWeek },
    });

    const overlaps = slotsOnDay.some(
      (slot) =>
        slot.id !== excludeId &&
        startTime < slot.endTime &&
        slot.startTime < endTime,
    );


    if (overlaps) {
      throw new ConflictException(
        'This availability slot overlaps with an existing one on that day',
      );
    }
  }

  async create(createAvailabilityDto: CreateAvailabilityDto, user: User) {
    const { dayOfWeek, startTime, endTime } = createAvailabilityDto;

    this.assertValidTimeRange(startTime, endTime);
    await this.assertNoOverlap(user.id, dayOfWeek, startTime, endTime);

    const availability = this.availabilityRepository.create({
      dayOfWeek,
      startTime,
      endTime,
      ownerId: user.id,
    });

    return this.availabilityRepository.save(availability);
  }

  findAll(user: User) {
    return this.availabilityRepository.find({ where: { ownerId: user.id } });
  }

  async findOne(id: string) {
    const availability = await this.availabilityRepository.findOne({
      where: { id },
    });
    if (!availability) {
      throw new NotFoundException('Availability slot not found');
    }
    return availability;
  }

  async update(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
    user: User,
  ) {
    const availability = await this.findOne(id);

    if (availability.ownerId !== user.id) {
      throw new ForbiddenException(
        'You can only update your own availability slots',
      );
    }

    const dayOfWeek = updateAvailabilityDto.dayOfWeek ?? availability.dayOfWeek;
    const startTime = updateAvailabilityDto.startTime ?? availability.startTime;
    const endTime = updateAvailabilityDto.endTime ?? availability.endTime;

    this.assertValidTimeRange(startTime, endTime);
    await this.assertNoOverlap(user.id, dayOfWeek, startTime, endTime, id);

    Object.assign(availability, { dayOfWeek, startTime, endTime });
    return this.availabilityRepository.save(availability);
  }

  async remove(id: string, user: User) {
    const availability = await this.findOne(id);

    if (availability.ownerId !== user.id) {
      throw new ForbiddenException(
        'You can only delete your own availability slots',
      );
    }

    await this.availabilityRepository.remove(availability);
    return { message: 'Availability slot deleted successfully' };
  }
}
