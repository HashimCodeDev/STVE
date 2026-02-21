import express from 'express';
import { createReading, createBatchReadings } from '../controllers/readingController.js';

const router = express.Router();

// Ingest a single sensor reading
router.post('/', createReading);

// Batch ingest multiple readings
router.post('/batch', createBatchReadings);

export default router;
