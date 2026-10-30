const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const db = require('../config/db');

// Admin-only stats from real DB tables
router.get('/stats', auth, async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Forbidden: Admin only' });
  }
  try {
    const [
      totalComplaints,
      resolvedComplaints,
      openComplaints,
      totalUsers,
      totalStations,
      totalTrains,
      roleBreakdown
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM complaints'),
      db.query("SELECT COUNT(*) FROM complaints WHERE status = 'Resolved'"),
      db.query("SELECT COUNT(*) FROM complaints WHERE status != 'Resolved'"),
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM stations'),
      db.query('SELECT COUNT(*) FROM train_details'),
      db.query("SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC")
    ]);

    res.json({
      totalComplaints: parseInt(totalComplaints.rows[0].count),
      resolvedComplaints: parseInt(resolvedComplaints.rows[0].count),
      openComplaints: parseInt(openComplaints.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalStations: parseInt(totalStations.rows[0].count),
      totalTrains: parseInt(totalTrains.rows[0].count),
      roleBreakdown: roleBreakdown.rows
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ message: 'Error fetching admin stats' });
  }
});

module.exports = router;
