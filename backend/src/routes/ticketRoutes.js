import express from 'express';
import { getTickets, updateTicket } from '../controllers/ticketController.js';

const router = express.Router();

// Get all tickets
router.get('/', getTickets);

// Update ticket status
router.patch('/:id', updateTicket);

export default router;
