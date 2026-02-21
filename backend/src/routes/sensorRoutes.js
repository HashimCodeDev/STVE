import express from 'express';
import { createSensor, getSensors, getSensor, getSensorTrustHistory } from '../controllers/sensorController.js';
import { validateSensorRegistration } from '../middleware/validation.js';
import { standardRateLimit, lenientRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Register a new sensor
router.post('/', standardRateLimit, validateSensorRegistration, createSensor);

// Get all sensors
router.get('/', lenientRateLimit, getSensors);

// Get sensor by ID
router.get('/:id', lenientRateLimit, getSensor);

// Get trust score history for a sensor
router.get('/:id/trust-history', lenientRateLimit, getSensorTrustHistory);

export default router;
