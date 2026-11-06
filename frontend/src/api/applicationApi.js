import { httpClient } from './httpClient.js';

// K01 query functions only. Keep future T04/T05 submission/CV exports intact.
export function createApplicationApi(client = httpClient) {
  return {
    getJobApplications(jobId, { page = 1, size = 20, token, signal } = {}) {
      const query = new URLSearchParams({ page: String(page), size: String(size) });
      return client(`/api/jobs/${encodeURIComponent(jobId)}/applications?${query}`, { token, signal });
    },
    getApplicationDetail(applicationId, { token, signal } = {}) {
      return client(`/api/applications/${encodeURIComponent(applicationId)}`, { token, signal });
    },
  };
}

export const { getJobApplications, getApplicationDetail } = createApplicationApi();
