const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount routes
router.use(`/api/${API_VERSION}/auth`, authRoutes);
router.use(`/api/${API_VERSION}/users`, userRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// API health check
router.get(`/api/${API_VERSION}/health`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    data: {
      version: API_VERSION,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
