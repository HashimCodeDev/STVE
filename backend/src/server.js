import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import sensorRoutes from './routes/sensorRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { validateEnv } from './utils/env.js';
import { initializeWebSocket, broadcastDashboardUpdate, getIO } from './utils/websocket.js';

// Validate environment variables at startup
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - restrict origins in production
const corsOptions = {
    origin: process.env.CORS_ORIGIN === '*' ? '*' :
        process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) :
            'http://localhost:3000',
    optionsSuccessStatus: 200,
    credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Add payload size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (no authentication required)
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Probos API is running' });
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
    try {
        const io = getIO();
        res.json({
            success: true,
            connected: io.engine.clientsCount,
            initialized: true
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            initialized: false
        });
    }
});

// WebSocket test endpoint (no authentication required)
app.post('/api/test/websocket', (req, res) => {
    try {
        broadcastDashboardUpdate({ test: true, timestamp: new Date() });
        res.json({ success: true, message: 'WebSocket broadcast sent' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Apply authentication middleware to all API routes (if API_KEY is set)
app.use('/api', authenticate);

// API Routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Probos API server running on port ${PORT}`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔌 WebSocket server initialized`);
});
