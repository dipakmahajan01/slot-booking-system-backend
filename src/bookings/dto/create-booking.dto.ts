import { IsISO8601, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID('4', { message: 'Invalid service ID format' })
  @IsNotEmpty({ message: 'serviceId is required' })
  serviceId!: string;

  @IsISO8601(
    {},
    { message: 'slotStartTime must be a valid ISO 8601 date-time' },
  )
  @IsNotEmpty({ message: 'slotStartTime is required' })
  slotStartTime!: string;

  @IsISO8601(
    {},
    { message: 'slotEndTime must be a valid ISO 8601 date-time' },
  )
  @IsNotEmpty({ message: 'slotEndTime is required' })
  slotEndTime!: string;
}
