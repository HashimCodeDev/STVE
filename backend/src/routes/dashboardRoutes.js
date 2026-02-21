import express from 'express';
import { getSummary, getZones, getActivity } from '../controllers/dashboardController.js';

const router = express.Router();

// Get dashboard summary
router.get('/summary', getSummary);

// Get zone statistics
router.get('/zones', getZones);

// Get recent activity
router.get('/activity', getActivity);

export default router;
