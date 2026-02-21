import express from 'express';
import cors from 'cors';
import sensorRoutes from './routes/sensorRoutes.js';
import readingRoutes from './routes/readingRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Probos API is running' });
});

// API Routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Probos API server running on port ${PORT}`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});
