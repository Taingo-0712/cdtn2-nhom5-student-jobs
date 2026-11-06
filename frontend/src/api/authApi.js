import { httpClient } from './httpClient.js';

export async function login(email, password) {
  const response = await httpClient('/api/auth/login', {
    method: 'POST',
    json: { email, password },
  });

  return response.data;
}
