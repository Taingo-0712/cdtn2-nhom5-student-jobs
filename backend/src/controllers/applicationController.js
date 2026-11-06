function createApplicationController(service, getAuthenticatedUser) {
  // URLSearchParams preserves duplicate query keys regardless of Express query parser.
  const query = (req) => new URL(req.originalUrl, 'http://localhost').searchParams;
  return {
    async list(req, res) {
      const user = await getAuthenticatedUser(req);
      res.set('Cache-Control', 'private, no-store');
      res.json(await service.listForJob(user, req.params.job_id, query(req)));
    },
    async detail(req, res) {
      const user = await getAuthenticatedUser(req);
      res.set('Cache-Control', 'private, no-store');
      res.json(await service.getDetail(user, req.params.application_id, query(req)));
    },
  };
}

module.exports = { createApplicationController };
