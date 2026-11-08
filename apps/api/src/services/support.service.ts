import type {
  CreateTicketInput,
  PaginationMeta,
  SupportTicketDetailDto,
  SupportTicketDto,
  TicketListQuery,
  TicketListResult,
  TicketMessageDto,
  TicketMessageInput,
} from '@engineering-lab/shared';
import { Prisma, type TicketStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { sendContactNotification, sendTicketReplyNotification } from '../lib/mailer.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import type { Locale } from '@engineering-lab/shared';

const senderSelect = { select: { id: true, name: true, role: true } } as const;

type TicketMessageRow = Prisma.TicketMessageGetPayload<{ include: { sender: typeof senderSelect } }>;

type TicketRow = Prisma.SupportTicketGetPayload<{
  include: {
    messages: { orderBy: { createdAt: 'asc' }; include: { sender: typeof senderSelect } };
    _count: { select: { messages: true } };
  };
}>;

type TicketListRow = Prisma.SupportTicketGetPayload<{
  include: {
    messages: {
      orderBy: { createdAt: 'desc' };
      take: 1;
      include: { sender: typeof senderSelect };
    };
    _count: { select: { messages: true } };
  };
}>;

function toMessageDto(message: TicketMessageRow): TicketMessageDto {
  return {
    id: message.id,
    body: message.body,
    isStaff: message.isStaff,
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt.toISOString(),
    sender: message.sender
      ? { id: message.sender.id, name: message.sender.name, role: message.sender.role }
      : null,
  };
}

function toTicketDto(ticket: TicketListRow | TicketRow): SupportTicketDto {
  const lastMessage = ticket.messages[ticket.messages.length - 1] ?? null;
  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    orderReference: ticket.orderReference,
    orderId: ticket.orderId,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    messageCount: ticket._count.messages,
    lastMessage: lastMessage ? toMessageDto(lastMessage) : null,
  };
}

function toTicketDetailDto(ticket: TicketRow): SupportTicketDetailDto {
  return {
    ...toTicketDto(ticket),
    messages: ticket.messages.map(toMessageDto),
  };
}

const ticketListInclude = {
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1, include: { sender: senderSelect } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

const ticketDetailInclude = {
  messages: { orderBy: { createdAt: 'asc' as const }, include: { sender: senderSelect } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

export async function listTickets(
  userId: string,
  query: TicketListQuery,
): Promise<TicketListResult> {
  const where = {
    userId,
    ...(query.status ? { status: query.status } : {}),
  } satisfies Prisma.SupportTicketWhereInput;

  const [total, tickets] = await Promise.all([
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: ticketListInclude,
    }),
  ]);

  const pagination: PaginationMeta = {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    hasNextPage: query.page * query.pageSize < total,
    hasPreviousPage: query.page > 1,
  };

  return { items: tickets.map(toTicketDto), pagination };
}

async function getOwnedTicket(userId: string, ticketId: string): Promise<TicketRow> {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId },
    include: ticketDetailInclude,
  });
  if (!ticket) {
    throw AppError.notFound('Support ticket not found', ErrorCodes.TICKET_NOT_FOUND);
  }
  return ticket;
}

export async function getTicket(
  userId: string,
  ticketId: string,
): Promise<SupportTicketDetailDto> {
  return toTicketDetailDto(await getOwnedTicket(userId, ticketId));
}

async function notifyStoreOfTicket(
  userId: string,
  input: { subject: string; body: string; orderReference?: string | null },
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true },
  });
  if (!user) {
    return;
  }
  await sendContactNotification({
    name: user.name,
    email: user.email,
    phone: user.phone,
    subject: `[Ticket] ${input.subject}${input.orderReference ? ` (${input.orderReference})` : ''}`,
    message: input.body,
  });
}

export async function createTicket(
  userId: string,
  input: CreateTicketInput,
): Promise<SupportTicketDetailDto> {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: input.subject,
      category: input.category,
      orderReference: input.orderReference ?? null,
      orderId: input.orderId ?? null,
      messages: { create: { senderId: userId, body: sanitizePlainText(input.message) } },
    },
    include: ticketDetailInclude,
  });

  await notifyStoreOfTicket(userId, {
    subject: input.subject,
    body: input.message,
    orderReference: input.orderReference ?? null,
  });

  return toTicketDetailDto(ticket);
}

const REOPENABLE_STATUSES: TicketStatus[] = ['RESOLVED', 'CLOSED'];

export async function addTicketMessage(
  userId: string,
  ticketId: string,
  input: TicketMessageInput,
): Promise<SupportTicketDetailDto> {
  const existing = await getOwnedTicket(userId, ticketId);

  const [, updated] = await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: existing.id, senderId: userId, body: sanitizePlainText(input.body) },
    }),
    prisma.supportTicket.update({
      where: { id: existing.id },
      data: REOPENABLE_STATUSES.includes(existing.status) ? { status: 'OPEN' } : {},
      include: ticketDetailInclude,
    }),
  ]);

  await notifyStoreOfTicket(userId, {
    subject: existing.subject,
    body: input.body,
    orderReference: existing.orderReference,
  });

  // The customer receives a copy so the thread is mirrored in email.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, locale: true },
  });
  if (user) {
    const locale: Locale = user.locale === 'en' ? 'en' : 'ar';
    await sendTicketReplyNotification({
      to: user.email,
      customerName: user.name,
      subject: existing.subject,
      body: input.body,
      ticketUrl: `${env.WEB_URL}/${locale}/support/${existing.id}`,
      locale,
    });
  }

  return toTicketDetailDto(updated);
}

export async function closeTicket(
  userId: string,
  ticketId: string,
): Promise<SupportTicketDetailDto> {
  const existing = await getOwnedTicket(userId, ticketId);
  if (existing.status === 'CLOSED') {
    return toTicketDetailDto(existing);
  }
  const updated = await prisma.supportTicket.update({
    where: { id: existing.id },
    data: { status: 'CLOSED' },
    include: ticketDetailInclude,
  });
  return toTicketDetailDto(updated);
}
