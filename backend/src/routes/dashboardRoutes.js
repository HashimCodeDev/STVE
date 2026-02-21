import express from 'express';
import { getSummary, getZones, getActivity } from '../controllers/dashboardController.js';
import { validateQueryParams } from '../middleware/validation.js';
import { lenientRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Get dashboard summary
router.get('/summary', lenientRateLimit, getSummary);

// Get zone statistics
router.get('/zones', lenientRateLimit, getZones);

// Get recent activity
router.get('/activity', lenientRateLimit, validateQueryParams({
    limit: { type: 'number', required: false, min: 1, max: 100 }
}), getActivity);

export default router;
