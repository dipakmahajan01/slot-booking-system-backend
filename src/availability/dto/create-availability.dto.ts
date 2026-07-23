import { IsEnum, IsMilitaryTime } from 'class-validator';
import { DayOfWeek } from '../entities/availability.entity';

export class CreateAvailabilityDto {
  @IsEnum(DayOfWeek, {
    message:
      'dayOfWeek must be one of: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY',
  })
  dayOfWeek!: DayOfWeek;

  @IsMilitaryTime({ message: 'startTime must be in 24-hour HH:MM format' })
  startTime!: string;

  @IsMilitaryTime({ message: 'endTime must be in 24-hour HH:MM format' })
  endTime!: string;
}
