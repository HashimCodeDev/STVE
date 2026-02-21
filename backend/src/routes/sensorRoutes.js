import express from 'express';
import { createSensor, getSensors, getSensor } from '../controllers/sensorController.js';

const router = express.Router();

// Register a new sensor
router.post('/', createSensor);

// Get all sensors
router.get('/', getSensors);

// Get sensor by ID
router.get('/:id', getSensor);

export default router;
