import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixResetTokenColumnName1769880000000 implements MigrationInterface {
  name = 'FixResetTokenColumnName1769880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the old camelCase column exists and rename it to snake_case
    const hasOldColumn = await queryRunner.hasColumn('users', 'resetToken');
    const hasNewColumn = await queryRunner.hasColumn('users', 'reset_token');

    if (hasOldColumn && !hasNewColumn) {
      // Drop old index if exists
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_user_reset_token"
      `);

      // Rename the column from camelCase to snake_case
      await queryRunner.query(`
        ALTER TABLE "users"
        RENAME COLUMN "resetToken" TO "reset_token"
      `);

      // Recreate index with new column name
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_user_reset_token" ON "users" ("reset_token")
      `);
    } else if (!hasOldColumn && !hasNewColumn) {
      // Neither column exists, create the correct one
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "reset_token" character varying(64)
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_user_reset_token" ON "users" ("reset_token")
      `);
    }
    // If hasNewColumn is true, nothing to do - correct column already exists
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to old column name if needed
    const hasNewColumn = await queryRunner.hasColumn('users', 'reset_token');

    if (hasNewColumn) {
      await queryRunner.query(`
        DROP INDEX IF EXISTS "idx_user_reset_token"
      `);

      await queryRunner.query(`
        ALTER TABLE "users"
        RENAME COLUMN "reset_token" TO "resetToken"
      `);

      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "idx_user_reset_token" ON "users" ("resetToken")
      `);
    }
  }
}
