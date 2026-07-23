import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Service } from '../services/entities/service.entity';
import { Availability, DayOfWeek } from '../availability/entities/availability.entity';
import { User } from '../users/entities/user.entity';

const DAY_INDEX: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

function nextDateForDay(dayOfWeek: DayOfWeek, hour: number, minute: number): Date {
  const targetIndex = DAY_INDEX.indexOf(dayOfWeek);
  const now = new Date();
  const daysAhead = ((targetIndex - now.getDay() + 7) % 7 || 7);
  const result = new Date(now);
  result.setDate(now.getDate() + daysAhead);
  result.setHours(hour, minute, 0, 0);
  return result;
}

const createQueryBuilderMock = (result: unknown, method: 'getOne' | 'getMany') => {
  const builder: Record<string, jest.Mock> = {};
  ['innerJoin', 'innerJoinAndSelect', 'where', 'andWhere'].forEach((name) => {
    builder[name] = jest.fn().mockReturnValue(builder);
  });
  builder.getOne = jest.fn().mockResolvedValue(method === 'getOne' ? result : undefined);
  builder.getMany = jest.fn().mockResolvedValue(method === 'getMany' ? result : undefined);
  return builder;
};

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {
    transaction: jest.fn(),
  },
});

const mockCustomer = { id: 'customer-1', role: 'CUSTOMER' } as unknown as User;
const mockOwner = { id: 'owner-1', role: 'Owner' } as unknown as User;

const mockOwnedService: Service = {
  id: 'service-1',
  name: 'Haircut',
  duration: 30,
  price: 25,
  ownerId: 'owner-1',
  owner: mockOwner,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAvailability: Availability = {
  id: 'avail-1',
  ownerId: 'owner-1',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '09:00:00',
  endTime: '17:00:00',
  owner: mockOwner,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepository: ReturnType<typeof mockRepository>;
  let serviceRepository: ReturnType<typeof mockRepository>;
  let availabilityRepository: ReturnType<typeof mockRepository>;
  let mockManager: {
    query: jest.Mock;
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useFactory: mockRepository },
        { provide: getRepositoryToken(Service), useFactory: mockRepository },
        {
          provide: getRepositoryToken(Availability),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    bookingRepository = module.get(getRepositoryToken(Booking));
    serviceRepository = module.get(getRepositoryToken(Service));
    availabilityRepository = module.get(getRepositoryToken(Availability));

    mockManager = {
      query: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
      create: jest.fn((_entity, data) => data),
      save: jest.fn(async (data) => ({ id: 'new-booking-id', ...data })),
    };
    bookingRepository.manager.transaction.mockImplementation((cb) =>
      cb(mockManager),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validStart = () => nextDateForDay(DayOfWeek.MONDAY, 10, 0);
    const validEnd = (start: Date) => new Date(start.getTime() + 30 * 60000);

    it('throws BadRequestException when slotEndTime is not after slotStartTime', async () => {
      const start = validStart();
      await expect(
        service.create(
          {
            serviceId: 'service-1',
            slotStartTime: start.toISOString(),
            slotEndTime: start.toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the slot is in the past', async () => {
      const past = new Date(Date.now() - 60000);
      await expect(
        service.create(
          {
            serviceId: 'service-1',
            slotStartTime: past.toISOString(),
            slotEndTime: new Date(past.getTime() + 30 * 60000).toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the service does not exist', async () => {
      serviceRepository.findOne.mockResolvedValue(null);
      const start = validStart();

      await expect(
        service.create(
          {
            serviceId: 'missing-service',
            slotStartTime: start.toISOString(),
            slotEndTime: validEnd(start).toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when the slot duration doesn't match the service duration", async () => {
      serviceRepository.findOne.mockResolvedValue(mockOwnedService);
      const start = validStart();
      const wrongEnd = new Date(start.getTime() + 45 * 60000);

      await expect(
        service.create(
          {
            serviceId: 'service-1',
            slotStartTime: start.toISOString(),
            slotEndTime: wrongEnd.toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when the slot is outside the owner's availability", async () => {
      serviceRepository.findOne.mockResolvedValue(mockOwnedService);
      availabilityRepository.find.mockResolvedValue([mockAvailability]);
      const start = nextDateForDay(DayOfWeek.MONDAY, 20, 0); // 8pm, outside 09:00-17:00

      await expect(
        service.create(
          {
            serviceId: 'service-1',
            slotStartTime: start.toISOString(),
            slotEndTime: validEnd(start).toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the slot is already booked', async () => {
      serviceRepository.findOne.mockResolvedValue(mockOwnedService);
      availabilityRepository.find.mockResolvedValue([mockAvailability]);
      mockManager.createQueryBuilder.mockReturnValue(
        createQueryBuilderMock({ id: 'existing-booking' }, 'getOne'),
      );
      const start = validStart();

      await expect(
        service.create(
          {
            serviceId: 'service-1',
            slotStartTime: start.toISOString(),
            slotEndTime: validEnd(start).toISOString(),
          },
          mockCustomer,
        ),
      ).rejects.toThrow(ConflictException);
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('creates and saves the booking when everything is valid', async () => {
      serviceRepository.findOne.mockResolvedValue(mockOwnedService);
      availabilityRepository.find.mockResolvedValue([mockAvailability]);
      mockManager.createQueryBuilder.mockReturnValue(
        createQueryBuilderMock(null, 'getOne'),
      );
      const start = validStart();
      const end = validEnd(start);

      const result = await service.create(
        {
          serviceId: 'service-1',
          slotStartTime: start.toISOString(),
          slotEndTime: end.toISOString(),
        },
        mockCustomer,
      );

      expect(mockManager.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_xact_lock(hashtext($1))',
        ['owner-1'],
      );
      expect(result).toMatchObject({
        userId: 'customer-1',
        serviceId: 'service-1',
        status: BookingStatus.BOOKED,
      });
    });
  });

  describe('findAll', () => {
    it("returns the customer's own bookings when the caller is a customer", async () => {
      bookingRepository.find.mockResolvedValue([{ id: 'booking-1' }]);

      const result = await service.findAll(mockCustomer);

      expect(bookingRepository.find).toHaveBeenCalledWith({
        where: { userId: 'customer-1' },
      });
      expect(result).toEqual([{ id: 'booking-1' }]);
    });

    it('returns bookings against the owner\'s services when the caller is an owner', async () => {
      const qb = createQueryBuilderMock([{ id: 'booking-1' }], 'getMany');
      bookingRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(mockOwner);

      expect(qb.where).toHaveBeenCalledWith('service.ownerId = :ownerId', {
        ownerId: 'owner-1',
      });
      expect(result).toEqual([{ id: 'booking-1' }]);
    });
  });

  describe('findOne', () => {
    const bookingRecord = {
      id: 'booking-1',
      userId: 'customer-1',
      service: mockOwnedService,
    };

    it('throws NotFoundException when the booking does not exist', async () => {
      bookingRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing', mockCustomer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the caller is neither the customer nor the owner', async () => {
      bookingRepository.findOne.mockResolvedValue(bookingRecord);
      const stranger = { id: 'stranger-1' } as User;

      await expect(service.findOne('booking-1', stranger)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the booking for the customer who made it', async () => {
      bookingRepository.findOne.mockResolvedValue(bookingRecord);

      const result = await service.findOne('booking-1', mockCustomer);

      expect(result).toEqual(bookingRecord);
    });

    it('returns the booking for the owner of the service', async () => {
      bookingRepository.findOne.mockResolvedValue(bookingRecord);

      const result = await service.findOne('booking-1', mockOwner);

      expect(result).toEqual(bookingRecord);
    });
  });

  describe('update', () => {
    const activeBooking = () => ({
      id: 'booking-1',
      userId: 'customer-1',
      status: BookingStatus.BOOKED,
      service: mockOwnedService,
    });

    it.each([BookingStatus.CANCELLED, BookingStatus.COMPLETED, BookingStatus.NO_SHOW])(
      'throws BadRequestException when the booking is already %s',
      async (terminalStatus) => {
        bookingRepository.findOne.mockResolvedValue({
          ...activeBooking(),
          status: terminalStatus,
        });

        await expect(
          service.update(
            'booking-1',
            { status: BookingStatus.CANCELLED },
            mockCustomer,
          ),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('throws ForbiddenException when a customer tries to set a status other than CANCELLED', async () => {
      bookingRepository.findOne.mockResolvedValue(activeBooking());

      await expect(
        service.update(
          'booking-1',
          { status: BookingStatus.COMPLETED },
          mockCustomer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a customer to cancel their own booking', async () => {
      bookingRepository.findOne.mockResolvedValue(activeBooking());
      bookingRepository.save.mockImplementation(async (b) => b);

      const result = await service.update(
        'booking-1',
        { status: BookingStatus.CANCELLED },
        mockCustomer,
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('allows the owner to set any status', async () => {
      bookingRepository.findOne.mockResolvedValue(activeBooking());
      bookingRepository.save.mockImplementation(async (b) => b);

      const result = await service.update(
        'booking-1',
        { status: BookingStatus.COMPLETED },
        mockOwner,
      );

      expect(result.status).toBe(BookingStatus.COMPLETED);
    });
  });
});
