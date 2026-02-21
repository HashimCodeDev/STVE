import { getAllTickets, updateTicketStatus } from '../modules/maintenance.js';

/**
 * Get all tickets with optional status filter
 */
export const getTickets = async (req, res) => {
    try {
        const status = req.query.status || null;
        const tickets = await getAllTickets(status);
        res.json({
            success: true,
            data: tickets,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Update ticket status
 */
export const updateTicket = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await updateTicketStatus(req.params.id, status);
        res.json({
            success: true,
            data: ticket,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};
