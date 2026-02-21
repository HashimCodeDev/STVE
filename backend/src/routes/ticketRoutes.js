import express from 'express';
import { getTickets, updateTicket } from '../controllers/ticketController.js';
import { validateTicketStatus, validateQueryParams } from '../middleware/validation.js';
import { standardRateLimit, lenientRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Get all tickets
router.get('/', lenientRateLimit, validateQueryParams({
    status: { type: 'string', required: false, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] }
}), getTickets);

// Update ticket status
router.patch('/:id', standardRateLimit, validateTicketStatus, updateTicket);

export default router;
