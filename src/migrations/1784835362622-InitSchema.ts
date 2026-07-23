import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1784835362622 implements MigrationInterface {
    name = 'InitSchema1784835362622'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."availabilities_dayofweek_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`CREATE TABLE "availabilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" uuid NOT NULL, "dayOfWeek" "public"."availabilities_dayofweek_enum" NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9562bd8681d40361b1a124ea52c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "availabilities" ADD CONSTRAINT "FK_ffe23c68ba6861f10cfc474985b" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "availabilities" DROP CONSTRAINT "FK_ffe23c68ba6861f10cfc474985b"`);
        await queryRunner.query(`DROP TABLE "availabilities"`);
        await queryRunner.query(`DROP TYPE "public"."availabilities_dayofweek_enum"`);
    }

}
