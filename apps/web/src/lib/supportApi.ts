import type {
  SupportTicketDetailDto,
  TicketListResult,
  TicketStatus,
} from '@engineering-lab/shared';
import { api } from './api';

interface Data<T> {
  data: T;
}

export interface TicketListParams {
  status?: TicketStatus;
  page?: number;
  pageSize?: number;
}

export async function listTickets(params: TicketListParams = {}): Promise<TicketListResult> {
  const response = await api.get<Data<TicketListResult>>('/support/tickets', {
    params: Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== ''),
    ),
  });
  return response.data.data;
}

export interface CreateTicketBody {
  subject: string;
  category: string;
  orderReference?: string;
  message: string;
}

export async function createTicket(body: CreateTicketBody): Promise<SupportTicketDetailDto> {
  const response = await api.post<Data<{ ticket: SupportTicketDetailDto }>>(
    '/support/tickets',
    body,
  );
  return response.data.data.ticket;
}

export async function fetchTicket(id: string): Promise<SupportTicketDetailDto> {
  const response = await api.get<Data<{ ticket: SupportTicketDetailDto }>>(
    `/support/tickets/${encodeURIComponent(id)}`,
  );
  return response.data.data.ticket;
}

export async function replyTicket(id: string, body: string): Promise<SupportTicketDetailDto> {
  const response = await api.post<Data<{ ticket: SupportTicketDetailDto }>>(
    `/support/tickets/${encodeURIComponent(id)}/messages`,
    { body },
  );
  return response.data.data.ticket;
}

export async function closeTicket(id: string): Promise<SupportTicketDetailDto> {
  const response = await api.post<Data<{ ticket: SupportTicketDetailDto }>>(
    `/support/tickets/${encodeURIComponent(id)}/close`,
  );
  return response.data.data.ticket;
}
