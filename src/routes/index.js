const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const countryRoutes = require('./country.routes');
const institutionRoutes = require('./institution.routes');
const researchNetworkRoutes = require('./researchNetwork.routes');
const announcementRoutes = require('./announcement.routes');
const discussionRoutes = require('./discussion.routes');
const internalRoutes = require('./internal.routes');

// API version prefix
const API_VERSION = process.env.API_VERSION || 'v1';

// Mount routes
router.use(`/api/${API_VERSION}/auth`, authRoutes);
router.use(`/api/${API_VERSION}/users`, userRoutes);
router.use(`/api/${API_VERSION}/countries`, countryRoutes);
router.use(`/api/${API_VERSION}/institutions`, institutionRoutes);
router.use(`/api/${API_VERSION}/research-networks`, researchNetworkRoutes);
router.use(`/api/${API_VERSION}/announcements`, announcementRoutes);
router.use(`/api/${API_VERSION}/announcements/:announcementId/discussions`, discussionRoutes);

// Internal service-to-service routes (protected by INTERNAL_API_KEY — no JWT)
router.use(`/internal/${API_VERSION}`, internalRoutes);

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
