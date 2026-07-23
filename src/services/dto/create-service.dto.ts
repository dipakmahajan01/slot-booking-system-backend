import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateServiceDto {
  @IsString({ message: 'Name is required' })
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;

  @IsInt({ message: 'Duration must be a whole number of minutes' })
  @IsPositive({ message: 'Duration must be greater than 0' })
  duration!: number;

  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than 0' })
  price!: number;
}
