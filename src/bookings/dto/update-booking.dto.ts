import { IsEnum, IsNotEmpty } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class UpdateBookingDto {
  @IsEnum(BookingStatus, {
    message: 'status must be one of: BOOKED, CANCELLED, COMPLETED, NO_SHOW',
  })
  @IsNotEmpty({ message: 'status is required' })
  status!: BookingStatus;
}
