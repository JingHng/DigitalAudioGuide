/**
 * System settings API service
 * 
 * Provides functions for interacting with the system settings API endpoints.
 */

import apiClient from '../utils/apiClient';

/**
 * Get system settings including inactivity threshold
 * @returns Promise with system settings data
 */
export const getSystemSettings = async () => {
  return apiClient.get('/settings/system');
};

/**
 * Update system settings
 * @param settings Object containing system settings to update
 * @returns Promise with updated system settings
 */
export const updateSystemSettings = async (settings: { inactivityThresholdDays: number }) => {
  return apiClient.put('/settings/system', settings);
};
