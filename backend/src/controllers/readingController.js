import { ingestReading, ingestBatchReadings } from '../modules/dataIngestion.js';

/**
 * Ingest a single sensor reading
 */
export const createReading = async (req, res) => {
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
};

/**
 * Batch ingest multiple readings
 */
export const createBatchReadings = async (req, res) => {
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
};
