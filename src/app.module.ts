import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { BookingsModule } from './bookings/bookings.module';
import { RolesModule } from './roles/roles.module';
import { ServicesModule } from './services/services.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    UsersModule,
    ServicesModule,
    RolesModule,
    BookingsModule,
    AuthModule,
    AvailabilityModule,
  ],
})
export class AppModule {}
