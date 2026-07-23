import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const options = {
  type: 'postgres' as const,
  host: process.env.DB_HOST as string,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME as string,
  password: process.env.DB_PASSWORD as string,
  database: process.env.DB_NAME as string,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
} satisfies DataSourceOptions;

export const AppDataSource = new DataSource(options);
