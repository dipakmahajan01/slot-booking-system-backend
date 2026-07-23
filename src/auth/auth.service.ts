import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const POSTGRES_UNIQUE_VIOLATION = '23505';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly jwtService: JwtService,
  ) { }

  async createUser(registerDto: RegisterDto) {
    const { email, firstName, lastName, roleName } = registerDto

    const existingUser = await this.usersRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }
    const role = await this.rolesRepository.findOne({
      where: { roleName: roleName },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, SALT_ROUNDS);

    const user = this.usersRepository.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password: hashedPassword,
      roleId: role.id,
    });

    let savedUser: User;
    try {
      savedUser = await this.usersRepository.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
        POSTGRES_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new InternalServerErrorException('Failed to create user');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = savedUser;
    return result;
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      role: user.role?.roleName,
    };

    let accessToken: string;
    try {
      accessToken = await this.jwtService.signAsync(payload);
    } catch {
      throw new InternalServerErrorException('Failed to issue access token');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return { accessToken, user: safeUser };
  }

  validateToken(token: string) {
    return this.jwtService.verify(token, {
      secret: process.env.JWT_SECRET_KEY
    });
  }
}
