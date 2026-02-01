import { IsUUID, IsOptional, IsNumberString } from 'class-validator';

export class QueryAuditLogDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
