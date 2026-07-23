import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import {
  Availability,
  DayOfWeek,
} from '../availability/entities/availability.entity';
import { User } from '../users/entities/user.entity';

const DAYS_OF_WEEK: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Availability)
    private readonly availabilityRepository: Repository<Availability>,
  ) {}

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private timeOfDayMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  private isOwner(user: User): boolean {
    return String(user.role).toLowerCase() === 'owner';
  }

  async create(createBookingDto: CreateBookingDto, user: User) {
    const slotStartTime = new Date(createBookingDto.slotStartTime);
    const slotEndTime = new Date(createBookingDto.slotEndTime);

    if (slotEndTime <= slotStartTime) {
      throw new BadRequestException('slotEndTime must be after slotStartTime');
    }
    if (slotStartTime.getTime() < Date.now()) {
      throw new BadRequestException('Cannot book a slot in the past');
    }

    const service = await this.serviceRepository.findOne({
      where: { id: createBookingDto.serviceId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const durationMinutes = Math.round(
      (slotEndTime.getTime() - slotStartTime.getTime()) / 60000,
    );
    if (durationMinutes !== service.duration) {
      throw new BadRequestException(
        `This service requires a ${service.duration}-minute slot`,
      );
    }

    const dayOfWeek = DAYS_OF_WEEK[slotStartTime.getDay()];
    const startMinutes = this.timeOfDayMinutes(slotStartTime);
    const endMinutes = this.timeOfDayMinutes(slotEndTime);

    const availabilitySlots = await this.availabilityRepository.find({
      where: { ownerId: service.ownerId, dayOfWeek },
    });
    const withinAvailability = availabilitySlots.some(
      (slot) =>
        startMinutes >= this.toMinutes(slot.startTime) &&
        endMinutes <= this.toMinutes(slot.endTime),
    );
    if (!withinAvailability) {
      throw new BadRequestException(
        "Requested slot is outside the service owner's availability",
      );
    }

    return this.bookingRepository.manager.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        service.ownerId,
      ]);

      const conflictingBooking = await manager
        .createQueryBuilder(Booking, 'booking')
        .innerJoin('booking.service', 'service')
        .where('service.ownerId = :ownerId', { ownerId: service.ownerId })
        .andWhere('booking.status = :status', {
          status: BookingStatus.BOOKED,
        })
        .andWhere('booking.slotStartTime < :end', { end: slotEndTime })
        .andWhere('booking.slotEndTime > :start', { start: slotStartTime })
        .getOne();
      if (conflictingBooking) {
        throw new ConflictException('This time slot is already booked');
      }

      const booking = manager.create(Booking, {
        userId: user.id,
        serviceId: service.id,
        slotStartTime,
        slotEndTime,
        status: BookingStatus.BOOKED,
      });

      return manager.save(booking);
    });
  }

  findAll(user: User) {
    if (this.isOwner(user)) {
      return this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoinAndSelect('booking.service', 'service')
        .where('service.ownerId = :ownerId', { ownerId: user.id })
        .getMany();
    }
    return this.bookingRepository.find({ where: { userId: user.id } });
  }

  async findOne(id: string, user: User) {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['service'],
    });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isOwnerOfService = booking.service.ownerId === user.id;
    const isCustomer = booking.userId === user.id;
    if (!isOwnerOfService && !isCustomer) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, user: User) {
    const booking = await this.findOne(id, user);

    const terminalStatuses = [
      BookingStatus.CANCELLED,
      BookingStatus.COMPLETED,
      BookingStatus.NO_SHOW,
    ];
    if (terminalStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `This booking is already ${booking.status} and cannot be updated`,
      );
    }

    const isOwnerOfService = booking.service.ownerId === user.id;
    if (
      !isOwnerOfService &&
      updateBookingDto.status !== BookingStatus.CANCELLED
    ) {
      throw new ForbiddenException(
        'Customers can only cancel their own booking',
      );
    }

    booking.status = updateBookingDto.status;
    return this.bookingRepository.save(booking);
  }
}
