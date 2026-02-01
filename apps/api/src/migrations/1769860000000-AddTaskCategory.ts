import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskCategory1769860000000 implements MigrationInterface {
  name = 'AddTaskCategory1769860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type
    await queryRunner.query(`
      CREATE TYPE "public"."tasks_category_enum" AS ENUM('GENERAL', 'WORK', 'PERSONAL', 'URGENT')
    `);

    // Add the category column with default value
    await queryRunner.query(`
      ALTER TABLE "tasks" 
      ADD "category" "public"."tasks_category_enum" NOT NULL DEFAULT 'GENERAL'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the column
    await queryRunner.query(`
      ALTER TABLE "tasks" DROP COLUMN "category"
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "public"."tasks_category_enum"
    `);
  }
}
