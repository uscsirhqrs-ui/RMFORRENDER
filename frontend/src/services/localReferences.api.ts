/**
 * @fileoverview API Service - Handles HTTP client requests for Local References
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

import axios from 'axios';
import type { ApiResponse } from '../types/api-response';

import { API_BASE_URL } from '../constants';

const api = axios.create({
    baseURL: `${API_BASE_URL}/references/local`,
    withCredentials: true,
});

export const getAllLocalReferences = async (page = 1, limit = 10, filters: Record<string, any> = {}, sort = {}): Promise<ApiResponse> => {
    const processedFilters = { ...filters };

    // Join array filters with commas as expected by the backend
    Object.keys(processedFilters).forEach(key => {
        const value = processedFilters[key];
        if (value === undefined) return;

        if (Array.isArray(value)) {
            if (value.length > 0) {
                processedFilters[key] = value.join(',');
            } else {
                // If explicitly empty array, remove the key so it's not sent (Implies "All")
                delete processedFilters[key];
            }
        }
    });

    const params = {
        page,
        limit,
        ...processedFilters,
        ...sort
    };
    const response = await api.get('/', { params });
    return response.data;
};

export const createLocalReference = async (referenceData: any): Promise<ApiResponse> => {
    const response = await api.post('/', referenceData);
    return response.data;
};

export const getLocalReferenceById = async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/${id}`);
    return response.data;
};

export const getLocalDashboardStats = async (): Promise<ApiResponse> => {
    const response = await api.get('/stats');
    return response.data;
};

export const bulkUpdateLocalReferences = async (ids: string[], action: string, force?: boolean, data?: any): Promise<ApiResponse> => {
    const response = await api.post('/bulk-update', { ids, action, force, ...data });
    return response.data;
};

export const deleteLocalReference = async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/${id}`);
    return response.data;
};

export const updateLocalReference = async (id: string, referenceData: any): Promise<ApiResponse> => {
    const response = await api.put(`/${id}`, referenceData);
    return response.data;
};

export const issueLocalReminder = async (referenceId: string, userIds: string[], remarks: string, priority: string): Promise<ApiResponse> => {
    const response = await api.post('/issue-reminder', { referenceId, userIds, remarks, priority });
    return response.data;
};

export const requestLocalReopen = async (referenceId: string, remarks: string): Promise<ApiResponse> => {
    const response = await api.post(`/${referenceId}/request-reopen`, { remarks });
    return response.data;
};

export const getLocalReferenceFilters = async (params: { isArchived?: boolean, isHidden?: boolean } = {}): Promise<ApiResponse> => {
    const url = new URL(`${API_BASE_URL}/references/local/getFilters`);
    if (params.isArchived !== undefined) url.searchParams.append('isArchived', String(params.isArchived));
    if (params.isHidden !== undefined) url.searchParams.append('isHidden', String(params.isHidden));

    const response = await api.get(url.toString().replace(api.defaults.baseURL || '', '')); // Use relative path since axios instance has baseURL
    // Actually, axios instance "api" has baseURL set. We should pass params in config object.

    // Cleaner Axios way:
    return (await api.get('/getFilters', { params })).data;
};
