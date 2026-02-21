import express from 'express';
import cors from 'cors';
import { registerSensor, getAllSensors, getSensorById } from './modules/sensorRegistry.js';
import { ingestReading, ingestBatchReadings } from './modules/dataIngestion.js';
import { getAllTickets, updateTicketStatus } from './modules/maintenance.js';
import { getDashboardSummary, getZoneStatistics, getRecentActivity } from './modules/dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Probos API is running' });
});

/**
 * SENSOR REGISTRY ENDPOINTS
 */

// Register a new sensor
app.post('/api/sensors', async (req, res) => {
    try {
        const sensor = await registerSensor(req.body);
        res.status(201).json({
            success: true,
            data: sensor,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Get all sensors
app.get('/api/sensors', async (req, res) => {
    try {
        const sensors = await getAllSensors();
        res.json({
            success: true,
            data: sensors,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Get sensor by ID
app.get('/api/sensors/:id', async (req, res) => {
    try {
        const sensor = await getSensorById(req.params.id);
        if (!sensor) {
            return res.status(404).json({
                success: false,
                error: 'Sensor not found',
            });
        }
        res.json({
            success: true,
            data: sensor,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DATA INGESTION ENDPOINTS
 */

// Ingest a single sensor reading
app.post('/api/readings', async (req, res) => {
    try {
        const reading = await ingestReading(req.body);
        res.status(201).json({
            success: true,
            data: reading,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

// Batch ingest multiple readings
app.post('/api/readings/batch', async (req, res) => {
    try {
        const results = await ingestBatchReadings(req.body.readings || []);
        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * MAINTENANCE ENDPOINTS
 */

// Get all tickets
app.get('/api/tickets', async (req, res) => {
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
});

// Update ticket status
app.patch('/api/tickets/:id', async (req, res) => {
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
});

/**
 * DASHBOARD ENDPOINTS
 */

// Get dashboard summary
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const summary = await getDashboardSummary();
        res.json({
            success: true,
            data: summary,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Get zone statistics
app.get('/api/dashboard/zones', async (req, res) => {
    try {
        const zones = await getZoneStatistics();
        res.json({
            success: true,
            data: zones,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Get recent activity
app.get('/api/dashboard/activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activity = await getRecentActivity(limit);
        res.json({
            success: true,
            data: activity,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Probos API server running on port ${PORT}`);
    console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard/summary`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
});
