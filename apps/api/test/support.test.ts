import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { resetDatabase } from './helpers.js';

const app = createApp();
const authBase = '/api/v1/auth';
const base = '/api/v1/support/tickets';

const account = {
  name: 'Support User',
  email: 'support@example.com',
  password: 'Password123',
  locale: 'ar' as const,
};

let token = '';
let otherToken = '';

async function registerUser(email: string): Promise<string> {
  const response = await request(app)
    .post(`${authBase}/register`)
    .send({ ...account, email });
  expect(response.status).toBe(201);
  return (response.body as { data: { accessToken: string } }).data.accessToken;
}

function auth(value = token) {
  return { Authorization: `Bearer ${value}` };
}

async function createTicketRequest(value = token) {
  return request(app)
    .post(base)
    .set(auth(value))
    .send({
      subject: 'Order question',
      category: 'ORDER',
      orderReference: 'ORD-42',
      message: 'Where is my order?',
    });
}

beforeEach(async () => {
  await resetDatabase();
  token = await registerUser(account.email);
  otherToken = await registerUser('other@example.com');
});

describe('support tickets', () => {
  it('opens a ticket with its first message and returns the thread', async () => {
    const created = await createTicketRequest();
    expect(created.status).toBe(201);

    const ticket = (created.body as {
      data: {
        ticket: {
          id: string;
          status: string;
          category: string;
          orderReference: string | null;
          messageCount: number;
          messages: { body: string; sender: { name: string } | null }[];
        };
      };
    }).data.ticket;

    expect(ticket.status).toBe('OPEN');
    expect(ticket.category).toBe('ORDER');
    expect(ticket.orderReference).toBe('ORD-42');
    expect(ticket.messageCount).toBe(1);
    expect(ticket.messages[0]?.body).toBe('Where is my order?');
    expect(ticket.messages[0]?.sender?.name).toBe(account.name);

    const detail = await request(app).get(`${base}/${ticket.id}`).set(auth());
    expect(detail.status).toBe(200);
    expect((detail.body as { data: { ticket: { id: string } } }).data.ticket.id).toBe(ticket.id);
  });

  it('lists tickets with pagination and status filter', async () => {
    await createTicketRequest();
    await createTicketRequest();

    const listed = await request(app).get(base).set(auth());
    expect(listed.status).toBe(200);
    const body = listed.body as {
      data: {
        items: { id: string; messageCount: number; lastMessage: { body: string } | null }[];
        pagination: { total: number; totalPages: number };
      };
    };
    expect(body.data.items).toHaveLength(2);
    expect(body.data.pagination.total).toBe(2);
    expect(body.data.items[0]?.messageCount).toBe(1);
    expect(body.data.items[0]?.lastMessage?.body).toBe('Where is my order?');

    const filtered = await request(app).get(`${base}?status=RESOLVED`).set(auth());
    expect((filtered.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('appends replies and reopens resolved tickets', async () => {
    const created = await createTicketRequest();
    const ticketId = (created.body as { data: { ticket: { id: string } } }).data.ticket.id;

    const replied = await request(app)
      .post(`${base}/${ticketId}/messages`)
      .set(auth())
      .send({ body: 'Any update?' });
    expect(replied.status).toBe(200);
    const afterReply = (replied.body as {
      data: { ticket: { messageCount: number; status: string } };
    }).data.ticket;
    expect(afterReply.messageCount).toBe(2);
    expect(afterReply.status).toBe('OPEN');

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED' },
    });

    const reopen = await request(app)
      .post(`${base}/${ticketId}/messages`)
      .set(auth())
      .send({ body: 'Still broken' });
    expect(reopen.status).toBe(200);
    expect((reopen.body as { data: { ticket: { status: string } } }).data.ticket.status).toBe(
      'OPEN',
    );
  });

  it('hides tickets from other users', async () => {
    const created = await createTicketRequest();
    const ticketId = (created.body as { data: { ticket: { id: string } } }).data.ticket.id;

    const foreign = await request(app).get(`${base}/${ticketId}`).set(auth(otherToken));
    expect(foreign.status).toBe(404);
    expect((foreign.body as { error: { code: string } }).error.code).toBe('TICKET_NOT_FOUND');

    const foreignReply = await request(app)
      .post(`${base}/${ticketId}/messages`)
      .set(auth(otherToken))
      .send({ body: 'intrusion' });
    expect(foreignReply.status).toBe(404);

    const foreignList = await request(app).get(base).set(auth(otherToken));
    expect((foreignList.body as { data: { items: unknown[] } }).data.items).toHaveLength(0);
  });

  it('validates ticket input', async () => {
    const invalid = await request(app)
      .post(base)
      .set(auth())
      .send({ subject: 'ab', message: '' });
    expect(invalid.status).toBe(422);
    expect((invalid.body as { error: { code: string } }).error.code).toBe('VALIDATION_ERROR');
  });

  it('requires authentication', async () => {
    const anonymous = await request(app).get(base);
    expect(anonymous.status).toBe(401);
  });
});

describe('support ticket close and payloads', () => {
  it('closes a ticket and only the owner can do it', async () => {
    const created = await createTicketRequest();
    const ticket = (created.body as {
      data: {
        ticket: {
          id: string;
          orderId: string | null;
          messages: { isStaff: boolean; attachments: unknown[] }[];
        };
      };
    }).data.ticket;
    expect(ticket.messages[0]).toMatchObject({ isStaff: false, attachments: [] });

    const foreignClose = await request(app)
      .post(`${base}/${ticket.id}/close`)
      .set(auth(otherToken));
    expect(foreignClose.status).toBe(404);

    const closed = await request(app).post(`${base}/${ticket.id}/close`).set(auth());
    expect(closed.status).toBe(200);
    expect((closed.body as { data: { ticket: { status: string } } }).data.ticket.status).toBe(
      'CLOSED',
    );

    const idempotent = await request(app).post(`${base}/${ticket.id}/close`).set(auth());
    expect(idempotent.status).toBe(200);
    expect(
      (idempotent.body as { data: { ticket: { status: string } } }).data.ticket.status,
    ).toBe('CLOSED');
  });
});
