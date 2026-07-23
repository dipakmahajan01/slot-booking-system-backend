import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1784816093715 implements MigrationInterface {
    name = 'InitSchema1784816093715';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "duration" integer NOT NULL, "price" numeric(10,2) NOT NULL, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba2d347a3168a296416c6c5ccb2" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roleName" character varying NOT NULL, "roleDescription" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_992f24b9d80eb1312440ca577f1" UNIQUE ("roleName"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "roleId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('BOOKED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')`);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "serviceId" uuid NOT NULL, "slotStartTime" TIMESTAMP NOT NULL, "slotEndTime" TIMESTAMP NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'BOOKED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "services" ADD CONSTRAINT "FK_f693969e1a4d7422c864d2b5537" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_368e146b785b574f42ae9e53d5e" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_38a69a58a323647f2e75eb994de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_15a2431ec10d29dcd96c9563b65" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_15a2431ec10d29dcd96c9563b65"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_38a69a58a323647f2e75eb994de"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_368e146b785b574f42ae9e53d5e"`);
        await queryRunner.query(`ALTER TABLE "services" DROP CONSTRAINT "FK_f693969e1a4d7422c864d2b5537"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TABLE "services"`);
    }

}
