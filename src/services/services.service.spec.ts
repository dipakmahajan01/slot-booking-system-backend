import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { Availability, DayOfWeek } from '../availability/entities/availability.entity';
import { User } from '../users/entities/user.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockUser = { id: 'owner-1' } as User;

const mockService: Service = {
  id: 'service-1',
  name: 'Haircut',
  duration: 30,
  price: 25,
  ownerId: 'owner-1',
  owner: { id: 'owner-1', firstName: 'Olivia', lastName: 'Owner' } as User,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ServicesService', () => {
  let service: ServicesService;
  let serviceRepository: ReturnType<typeof mockRepository>;
  let availabilityRepository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: getRepositoryToken(Service), useFactory: mockRepository },
        {
          provide: getRepositoryToken(Availability),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    serviceRepository = module.get(getRepositoryToken(Service));
    availabilityRepository = module.get(getRepositoryToken(Availability));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates and saves a new service when no duplicate name exists for the owner', async () => {
      serviceRepository.findOne.mockResolvedValue(null);
      serviceRepository.create.mockReturnValue(mockService);
      serviceRepository.save.mockResolvedValue(mockService);

      const result = await service.create(
        { name: 'Haircut', duration: 30, price: 25 },
        mockUser,
      );

      expect(serviceRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Haircut', ownerId: 'owner-1' },
      });
      expect(result).toEqual(mockService);
    });

    it('throws ConflictException when the owner already has a service with this name', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });

      await expect(
        service.create({ name: 'Haircut', duration: 30, price: 25 }, mockUser),
      ).rejects.toThrow(ConflictException);
      expect(serviceRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns only the given owner\'s services', async () => {
      serviceRepository.find.mockResolvedValue([mockService]);

      const result = await service.findAll(mockUser);

      expect(serviceRepository.find).toHaveBeenCalledWith({
        where: { ownerId: 'owner-1' },
      });
      expect(result).toEqual([mockService]);
    });
  });

  describe('findOne', () => {
    it('returns the service when found', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });

      const result = await service.findOne('service-1');

      expect(result).toEqual(mockService);
    });

    it('throws NotFoundException when the service does not exist', async () => {
      serviceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the caller is not the owner', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      const otherUser = { id: 'someone-else' } as User;

      await expect(
        service.update('service-1', { price: 30 }, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when renaming to a name the owner already uses', async () => {
      serviceRepository.findOne
        .mockResolvedValueOnce(mockService) // findOne(id) inside findOne()
        .mockResolvedValueOnce({ ...mockService, id: 'other-service' }); // duplicate name check

      await expect(
        service.update('service-1', { name: 'Manicure' }, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('updates and saves the service when valid', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      serviceRepository.save.mockResolvedValue({ ...mockService, price: 40 });

      const result = await service.update('service-1', { price: 40 }, mockUser);

      expect(result.price).toBe(40);
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller is not the owner', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      const otherUser = { id: 'someone-else' } as User;

      await expect(service.remove('service-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the service and returns a confirmation message', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      serviceRepository.remove.mockResolvedValue(mockService);

      const result = await service.remove('service-1', mockUser);

      expect(result).toEqual({ message: 'Service deleted successfully' });
    });

    it('translates a foreign-key violation (active bookings) into a clean ConflictException', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      serviceRepository.remove.mockRejectedValue(
        new QueryFailedError('DELETE ...', undefined, {
          code: '23503',
        } as unknown as Error),
      );

      await expect(service.remove('service-1', mockUser)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unrelated database errors as-is', async () => {
      serviceRepository.findOne.mockResolvedValue({ ...mockService });
      const unrelatedError = new Error('connection lost');
      serviceRepository.remove.mockRejectedValue(unrelatedError);

      await expect(service.remove('service-1', mockUser)).rejects.toBe(
        unrelatedError,
      );
    });
  });

  describe('browse', () => {
    it('returns an empty array when there are no services', async () => {
      serviceRepository.find.mockResolvedValue([]);

      const result = await service.browse();

      expect(result).toEqual([]);
      expect(availabilityRepository.find).not.toHaveBeenCalled();
    });

    it('returns services with owner info and grouped availability', async () => {
      serviceRepository.find.mockResolvedValue([mockService]);
      availabilityRepository.find.mockResolvedValue([
        {
          id: 'avail-1',
          ownerId: 'owner-1',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00:00',
          endTime: '17:00:00',
        } as Availability,
      ]);

      const result = await service.browse();

      expect(result).toEqual([
        {
          id: 'service-1',
          name: 'Haircut',
          price: 25,
          duration: 30,
          owner: { id: 'owner-1', firstName: 'Olivia', lastName: 'Owner' },
          availability: [
            {
              dayOfWeek: DayOfWeek.MONDAY,
              startTime: '09:00:00',
              endTime: '17:00:00',
            },
          ],
        },
      ]);
    });
  });
});
