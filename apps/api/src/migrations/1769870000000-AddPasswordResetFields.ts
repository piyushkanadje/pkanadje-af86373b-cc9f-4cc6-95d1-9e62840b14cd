import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFields1769870000000 implements MigrationInterface {
  name = 'AddPasswordResetFields1769870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add reset_token column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_token" character varying(64)
    `);

    // Add reset_token_expiry column to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMP
    `);

    // Add index on reset_token for faster lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_reset_token" ON "users" ("reset_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_user_reset_token"
    `);

    // Remove reset_token_expiry column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "reset_token_expiry"
    `);

    // Remove reset_token column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "reset_token"
    `);
  }
}
