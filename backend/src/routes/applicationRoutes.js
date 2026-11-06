const { Router } = require('express');
const { createApplicationController } = require('../controllers/applicationController');

function createApplicationRouter({ service, authenticate, getAuthenticatedUser }) {
  if (typeof authenticate !== 'function') throw new TypeError('authenticate middleware is required');
  if (typeof getAuthenticatedUser !== 'function') throw new TypeError('getAuthenticatedUser resolver is required');
  if (!service || ['listForJob', 'getDetail'].some((key) => typeof service[key] !== 'function')) {
    throw new TypeError('K01 service methods are required');
  }
  const router = Router();
  const controller = createApplicationController(service, getAuthenticatedUser);
  // Full API paths: mount once with app.use(router), BEFORE the shared 404 handler.
  router.get('/api/jobs/:job_id/applications', authenticate, controller.list);
  router.get('/api/applications/:application_id', authenticate, controller.detail);
  return router;
}

module.exports = { createApplicationRouter };
