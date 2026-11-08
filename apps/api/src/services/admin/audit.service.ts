import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { paginationMeta } from '../../utils/pagination.js';

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listAuditLogs(filters: AuditLogFilters) {
  const { actorId, action, entity, entityId, from, to, page = 1, pageSize = 25 } = filters;
  const where: Prisma.AuditLogWhereInput = {};
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, unknown>).gte = from;
    if (to) (where.createdAt as Record<string, unknown>).lte = to;
  }

  const offset = (page - 1) * pageSize;
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  return {
    logs: logs.map((log) => ({
      id: log.id,
      actor: log.actor,
      actorName: log.actorName,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      before: log.before,
      after: log.after,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    })),
    pagination: paginationMeta(page, pageSize, total),
  };
}

export async function writeAuditLog(input: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: (input.before as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      after: (input.after as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
