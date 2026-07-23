import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  roleName!: string; // 'OWNER' | 'CUSTOMER'

  @Column({ nullable: true })
  roleDescription!: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];

  @CreateDateColumn()
  createdAt!: Date;
}
