import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { Availability, DayOfWeek } from './entities/availability.entity';
import { User } from '../users/entities/user.entity';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

const mockUser = { id: 'owner-1' } as User;

const mockSlot: Availability = {
  id: 'slot-1',
  ownerId: 'owner-1',
  dayOfWeek: DayOfWeek.MONDAY,
  startTime: '09:00:00',
  endTime: '10:00:00',
  owner: {} as User,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let availabilityRepository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Availability),
          useFactory: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    availabilityRepository = module.get(getRepositoryToken(Availability));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws BadRequestException when startTime is not before endTime', async () => {
      await expect(
        service.create(
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '10:00', endTime: '09:00' },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(availabilityRepository.find).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the new slot overlaps an existing one for that day', async () => {
      availabilityRepository.find.mockResolvedValue([mockSlot]);

      await expect(
        service.create(
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:30', endTime: '10:30' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException for an exact duplicate slot', async () => {
      availabilityRepository.find.mockResolvedValue([mockSlot]);

      await expect(
        service.create(
          { dayOfWeek: DayOfWeek.MONDAY, startTime: '09:00:00', endTime: '10:00:00' },
          mockUser,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates and saves the slot when there is no overlap', async () => {
      availabilityRepository.find.mockResolvedValue([mockSlot]);
      const newSlot = {
        ...mockSlot,
        id: 'slot-2',
        startTime: '11:00',
        endTime: '12:00',
      };
      availabilityRepository.create.mockReturnValue(newSlot);
      availabilityRepository.save.mockResolvedValue(newSlot);

      const result = await service.create(
        { dayOfWeek: DayOfWeek.MONDAY, startTime: '11:00', endTime: '12:00' },
        mockUser,
      );

      expect(result).toEqual(newSlot);
    });
  });

  describe('findAll', () => {
    it("returns only the given owner's slots", async () => {
      availabilityRepository.find.mockResolvedValue([mockSlot]);

      const result = await service.findAll(mockUser);

      expect(availabilityRepository.find).toHaveBeenCalledWith({
        where: { ownerId: 'owner-1' },
      });
      expect(result).toEqual([mockSlot]);
    });
  });

  describe('findOne', () => {
    it('returns the slot when found', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });

      const result = await service.findOne('slot-1');

      expect(result).toEqual(mockSlot);
    });

    it('throws NotFoundException when the slot does not exist', async () => {
      availabilityRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the caller is not the owner', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      const otherUser = { id: 'someone-else' } as User;

      await expect(
        service.update('slot-1', { endTime: '11:00' }, otherUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not conflict with itself when the time range is unchanged', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      availabilityRepository.find.mockResolvedValue([mockSlot]);
      availabilityRepository.save.mockResolvedValue(mockSlot);

      const result = await service.update(
        'slot-1',
        { endTime: '10:00:00' },
        mockUser,
      );

      expect(result).toEqual(mockSlot);
    });

    it('throws ConflictException when the updated range overlaps a different slot', async () => {
      const otherSlot = {
        ...mockSlot,
        id: 'slot-2',
        startTime: '11:00:00',
        endTime: '12:00:00',
      };
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      availabilityRepository.find.mockResolvedValue([mockSlot, otherSlot]);

      await expect(
        service.update('slot-1', { endTime: '11:30' }, mockUser),
      ).rejects.toThrow(ConflictException);
    });

    it('updates and saves the slot when valid', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      availabilityRepository.find.mockResolvedValue([mockSlot]);
      const updated = { ...mockSlot, endTime: '10:30' };
      availabilityRepository.save.mockResolvedValue(updated);

      const result = await service.update(
        'slot-1',
        { endTime: '10:30' },
        mockUser,
      );

      expect(result.endTime).toBe('10:30');
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the caller is not the owner', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      const otherUser = { id: 'someone-else' } as User;

      await expect(service.remove('slot-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deletes the slot and returns a confirmation message', async () => {
      availabilityRepository.findOne.mockResolvedValue({ ...mockSlot });
      availabilityRepository.remove.mockResolvedValue(mockSlot);

      const result = await service.remove('slot-1', mockUser);

      expect(result).toEqual({
        message: 'Availability slot deleted successfully',
      });
    });
  });
});
