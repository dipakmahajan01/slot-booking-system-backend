import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/role.guard';
import { Roles } from '../auth/roles.decorator';
import { GetUser } from '../auth/get-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Roles('Owner')
  @UseGuards(AuthGuard, RoleGuard)
  @Post()
  create(
    @Body() createAvailabilityDto: CreateAvailabilityDto,
    @GetUser() user: User,
  ) {
    return this.availabilityService.create(createAvailabilityDto, user);
  }

  @Roles('Owner')
  @UseGuards(AuthGuard, RoleGuard)
  @Get()
  findAll(@GetUser() user: User) {
    return this.availabilityService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.findOne(id);
  }

  @Roles('Owner')
  @UseGuards(AuthGuard, RoleGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
    @GetUser() user: User,
  ) {
    return this.availabilityService.update(id, updateAvailabilityDto, user);
  }

  @Roles('Owner')
  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.availabilityService.remove(id, user);
  }
}
