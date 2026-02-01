import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskPriority1769850000000 implements MigrationInterface {
    name = 'AddTaskPriority1769850000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "priority"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
    }

}
