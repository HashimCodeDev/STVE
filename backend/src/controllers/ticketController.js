import { getAllTickets, updateTicketStatus } from '../modules/maintenance.js';
import { analyseWithGemini } from '../modules/geminiAnalysis.js';  // ← new

/**
 * Get all tickets with optional status filter
 */
export const getTickets = async (req, res) => {
    try {
        const status  = req.query.status || null;
        const tickets = await getAllTickets(status);

        // ← new: ask Gemini to summarise the ticket list
        const { analysis } = await analyseWithGemini('tickets', tickets);

        res.json({
            success:   true,
            data:      tickets,
            aiSummary: analysis,   // ← new
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error:   error.message,
        });
    }
};

/**
 * Update ticket status — unchanged
 */
export const updateTicket = async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await updateTicketStatus(req.params.id, status);
        res.json({
            success: true,
            data:    ticket,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error:   error.message,
        });
    }
};