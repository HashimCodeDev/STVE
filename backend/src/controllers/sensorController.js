import { registerSensor, getAllSensors, getSensorById } from '../modules/sensorRegistry.js';

/**
 * Register a new sensor
 */
export const createSensor = async (req, res) => {
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
};

/**
 * Get all sensors
 */
export const getSensors = async (req, res) => {
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
};

/**
 * Get sensor by ID
 */
export const getSensor = async (req, res) => {
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
};
