import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '@task-manager/data';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>
  ) {}

  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId: dto.userId,
      action: dto.action,
      resource: dto.resource,
      organizationId: dto.organizationId || null,
      details: dto.details || null,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findByOrg(
    orgId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedAuditLogs> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { organizationId: orgId },
      order: { timestamp: 'DESC' },
      relations: ['user'],
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
