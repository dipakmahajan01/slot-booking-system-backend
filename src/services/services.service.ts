import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { Availability } from '../availability/entities/availability.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) {}

  async create(createServiceDto: CreateServiceDto, user: User) {
    const { name, duration, price } = createServiceDto;

    const existingService = await this.serviceRepository.findOne({
      where: { name, ownerId: user.id },
    });
    if (existingService) {
      throw new ConflictException(
        'You already have a service with this name',
      );
    }

    const service = this.serviceRepository.create({
      name,
      duration,
      price,
      ownerId: user.id,
    });

    return this.serviceRepository.save(service);
  }

  findAll(user: User) {
    return this.serviceRepository.find({ where: { ownerId: user.id } });
  }

  async findOne(id: string) {
    const service = await this.serviceRepository.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto, user: User) {
    const service = await this.findOne(id);

    if (service.ownerId !== user.id) {
      throw new ForbiddenException('You can only update your own services');
    }

    if (updateServiceDto.name && updateServiceDto.name !== service.name) {
      const existingService = await this.serviceRepository.findOne({
        where: { name: updateServiceDto.name, ownerId: user.id },
      });
      if (existingService) {
        throw new ConflictException(
          'You already have a service with this name',
        );
      }
    }

    Object.assign(service, updateServiceDto);
    return this.serviceRepository.save(service);
  }

  async remove(id: string, user: User) {
    const service = await this.findOne(id);

    if (service.ownerId !== user.id) {
      throw new ForbiddenException('You can only delete your own services');
    }

    try {
      await this.serviceRepository.remove(service);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === '23503'
      ) {
        throw new ConflictException(
          'Cannot delete a service with existing bookings',
        );
      }
      throw error;
    }
    return { message: 'Service deleted successfully' };
  }
  async browse() {
    const services = await this.serviceRepository.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    if (services.length === 0) {
      return [];
    }

    const ownerIds = [...new Set(services.map((service) => service.ownerId))];
    const availabilities = await this.availabilityRepository.find({
      where: { ownerId: In(ownerIds) },
    });

    const availabilityByOwner = new Map<string, Availability[]>();
    for (const slot of availabilities) {
      const slots = availabilityByOwner.get(slot.ownerId) ?? [];
      slots.push(slot);
      availabilityByOwner.set(slot.ownerId, slots);
    }

    return services.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      owner: {
        id: service.owner.id,
        firstName: service.owner.firstName,
        lastName: service.owner.lastName,
      },
      availability: (availabilityByOwner.get(service.ownerId) ?? []).map(
        (slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      ),
    }));
  }
}
