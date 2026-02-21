import { Server } from 'socket.io';
import cache from './cache.js';

/**
 * WebSocket Manager
 * Handles real-time updates to connected clients
 */

let io = null;

export function initializeWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN === '*' ? '*' :
                process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) :
                    'http://localhost:3000',
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log('✅ WebSocket client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('❌ WebSocket client disconnected:', socket.id);
        });

        socket.on('error', (error) => {
            console.error('🔥 WebSocket error:', error);
        });

        // Allow clients to subscribe to specific sensor updates
        socket.on('subscribe:sensor', (sensorId) => {
            socket.join(`sensor:${sensorId}`);
            console.log(`📍 Client ${socket.id} subscribed to sensor ${sensorId}`);
        });

        socket.on('unsubscribe:sensor', (sensorId) => {
            socket.leave(`sensor:${sensorId}`);
            console.log(`📍 Client ${socket.id} unsubscribed from sensor ${sensorId}`);
        });
    });

    console.log('🔌 WebSocket server initialized');
    return io;
}

// Broadcast dashboard updates to all connected clients
export function broadcastDashboardUpdate(data) {
    if (io) {
        const clientCount = io.engine.clientsCount;
        console.log(`📊 Broadcasting dashboard update to ${clientCount} client(s):`, data);
        io.emit('dashboard:update', data);
    } else {
        console.warn('⚠️  WebSocket not initialized, cannot broadcast dashboard update');
    }
}

// Broadcast sensor update to subscribed clients
export function broadcastSensorUpdate(sensorId, data) {
    if (io) {
        console.log('📡 Broadcasting sensor update:', sensorId);
        io.to(`sensor:${sensorId}`).emit('sensor:update', data);
    } else {
        console.warn('⚠️  WebSocket not initialized, cannot broadcast sensor update');
    }
}

// Broadcast new reading to all clients
export function broadcastNewReading(reading) {
    if (io) {
        const clientCount = io.engine.clientsCount;
        console.log(`📈 Broadcasting new reading to ${clientCount} client(s)`);
        io.emit('reading:new', reading);
    } else {
        console.warn('⚠️  WebSocket not initialized, cannot broadcast reading');
    }
}

// Broadcast ticket update
export function broadcastTicketUpdate(ticket) {
    if (io) {
        const clientCount = io.engine.clientsCount;
        console.log(`🎫 Broadcasting ticket update to ${clientCount} client(s):`, ticket.id);
        io.emit('ticket:update', ticket);
    } else {
        console.warn('⚠️  WebSocket not initialized, cannot broadcast ticket update');
    }
}

export function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}
