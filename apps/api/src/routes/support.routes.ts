import { Router } from 'express';
import { z } from 'zod';
import {
  createTicketSchema,
  ticketListQuerySchema,
  ticketMessageSchema,
  type CreateTicketInput,
  type TicketListQuery,
  type TicketMessageInput,
} from '@engineering-lab/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendData } from '../utils/http.js';
import {
  addTicketMessage,
  closeTicket,
  createTicket,
  getTicket,
  listTickets,
} from '../services/support.service.js';

const router = Router();

const ticketParamsSchema = z.object({ id: z.string().min(1).max(64) });

router.use(requireAuth);

router.get(
  '/tickets',
  validate({ query: ticketListQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await listTickets(req.authUser!.id, req.query as unknown as TicketListQuery);
    sendData(res, result);
  }),
);

router.post(
  '/tickets',
  validate({ body: createTicketSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await createTicket(req.authUser!.id, req.body as CreateTicketInput);
    sendData(res, { ticket }, 201);
  }),
);

router.get(
  '/tickets/:id',
  validate({ params: ticketParamsSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await getTicket(req.authUser!.id, req.params.id as string);
    sendData(res, { ticket });
  }),
);

router.post(
  '/tickets/:id/messages',
  validate({ params: ticketParamsSchema, body: ticketMessageSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await addTicketMessage(
      req.authUser!.id,
      req.params.id as string,
      req.body as TicketMessageInput,
    );
    sendData(res, { ticket });
  }),
);

router.post(
  '/tickets/:id/close',
  validate({ params: ticketParamsSchema }),
  asyncHandler(async (req, res) => {
    const ticket = await closeTicket(req.authUser!.id, req.params.id as string);
    sendData(res, { ticket });
  }),
);

export default router;
