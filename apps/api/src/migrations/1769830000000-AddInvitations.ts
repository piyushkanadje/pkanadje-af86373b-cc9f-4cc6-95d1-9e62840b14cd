import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvitations1769830000000 implements MigrationInterface {
  name = 'AddInvitations1769830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invitation status enum
    await queryRunner.query(`
      CREATE TYPE "public"."invitations_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')
    `);

    // Create invitations table
    await queryRunner.query(`
      CREATE TABLE "invitations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "token" character varying(64) NOT NULL,
        "role" "public"."user_organizations_role_enum" NOT NULL DEFAULT 'VIEWER',
        "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'PENDING',
        "organization_id" uuid NOT NULL,
        "invited_by_id" uuid NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "accepted_at" TIMESTAMP,
        CONSTRAINT "PK_invitations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invitation_token" UNIQUE ("token")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_invitation_token" ON "invitations" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_invitation_email" ON "invitations" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_invitation_org" ON "invitations" ("organization_id")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "invitations" 
      ADD CONSTRAINT "FK_invitation_organization" 
      FOREIGN KEY ("organization_id") 
      REFERENCES "organizations"("id") 
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "invitations" 
      ADD CONSTRAINT "FK_invitation_user" 
      FOREIGN KEY ("invited_by_id") 
      REFERENCES "users"("id") 
      ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "invitations" DROP CONSTRAINT "FK_invitation_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "invitations" DROP CONSTRAINT "FK_invitation_organization"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "public"."idx_invitation_org"`);
    await queryRunner.query(`DROP INDEX "public"."idx_invitation_email"`);
    await queryRunner.query(`DROP INDEX "public"."idx_invitation_token"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "invitations"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
  }
}
