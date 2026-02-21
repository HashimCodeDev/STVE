import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Maintenance Module
 * Handles ticket creation and management for anomalous sensors
 */

// Create a new maintenance ticket
export async function createMaintenanceTicket(data) {
    const { sensorId, issue, severity } = data;

    try {
        // Check if there's already an open ticket for this sensor
        const existingTicket = await prisma.ticket.findFirst({
            where: {
                sensorId,
                status: 'Open',
            },
        });

        // Don't create duplicate tickets
        if (existingTicket) {
            return existingTicket;
        }

        const ticket = await prisma.ticket.create({
            data: {
                sensorId,
                issue,
                severity: severity || 'Medium',
                status: 'Open',
            },
        });

        return ticket;
    } catch (error) {
        throw new Error(`Failed to create ticket: ${error.message}`);
    }
}

// Get all tickets (optionally filter by status)
export async function getAllTickets(status = null) {
    try {
        const where = status ? { status } : {};

        const tickets = await prisma.ticket.findMany({
            where,
            include: {
                sensor: {
                    select: {
                        sensorId: true,
                        zone: true,
                        type: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return tickets;
    } catch (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`);
    }
}

// Update ticket status
export async function updateTicketStatus(ticketId, newStatus) {
    try {
        const updateData = {
            status: newStatus,
        };

        // If resolving, add resolved timestamp
        if (newStatus === 'Resolved') {
            updateData.resolvedAt = new Date();
        }

        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: updateData,
        });

        return ticket;
    } catch (error) {
        throw new Error(`Failed to update ticket: ${error.message}`);
    }
}

// Get tickets for a specific sensor
export async function getTicketsBySensor(sensorId) {
    try {
        const tickets = await prisma.ticket.findMany({
            where: { sensorId },
            orderBy: { createdAt: 'desc' },
        });

        return tickets;
    } catch (error) {
        throw new Error(`Failed to fetch sensor tickets: ${error.message}`);
    }
}

// Get ticket statistics
export async function getTicketStats() {
    try {
        const [open, inProgress, resolved] = await Promise.all([
            prisma.ticket.count({ where: { status: 'Open' } }),
            prisma.ticket.count({ where: { status: 'InProgress' } }),
            prisma.ticket.count({ where: { status: 'Resolved' } }),
        ]);

        return {
            open,
            inProgress,
            resolved,
            total: open + inProgress + resolved,
        };
    } catch (error) {
        throw new Error(`Failed to get ticket stats: ${error.message}`);
    }
}
