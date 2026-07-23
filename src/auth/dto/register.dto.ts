import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'RoleName is required' })
  roleName!: string;
}
