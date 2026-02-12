/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-20
 */

import axiosInstance from './axiosInstance';

export interface ArchiveResponse {
    success: boolean;
    message: string;
    data: {
        local: number;
        global: number;
        total: number;
    }
}

export const getArchivableCount = async (date: string, type?: 'local' | 'global') => {
    try {
        const response = await axiosInstance.get(`/archive/count`, {
            params: { date, type }
        });
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: "Failed to fetch archivable count" };
    }
};

export const performArchiving = async (date: string, type?: 'local' | 'global'): Promise<ArchiveResponse> => {
    try {
        const response = await axiosInstance.post(`/archive/run`, { date, type });
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: "Failed to perform archiving" };
    }
};
