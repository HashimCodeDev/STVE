import express from 'express';
import { createReading, createBatchReadings } from '../controllers/readingController.js';
import { validateReading, validateBatchReadings } from '../middleware/validation.js';
import { standardRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Ingest a single sensor reading
router.post('/', standardRateLimit, validateReading, createReading);

// Batch ingest multiple readings
router.post('/batch', standardRateLimit, validateBatchReadings, createBatchReadings);

export default router;
