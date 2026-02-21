import { getDashboardSummary, getZoneStatistics, getRecentActivity } from '../modules/dashboard.js';

/**
 * Get dashboard summary
 */
export const getSummary = async (req, res) => {
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
};

/**
 * Get zone statistics
 */
export const getZones = async (req, res) => {
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
};

/**
 * Get recent activity
 */
export const getActivity = async (req, res) => {
    try {
        // Query params are validated by middleware, safe to use directly
        const limit = req.query.limit || 10;
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
};
