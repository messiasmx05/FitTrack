import { apiRequest } from './api.js';

export async function getUserData() {
  const result = await apiRequest('/data');
  return result.data;
}

export async function saveUserData(data) {
  await apiRequest('/data', {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}
