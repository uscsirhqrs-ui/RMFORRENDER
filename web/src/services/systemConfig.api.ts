/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import axiosInstance from './axiosInstance';

export interface SystemConfig {
    [key: string]: any;
}

export const getSystemConfig = async () => {
    try {
        const response = await axiosInstance.get('/system-config');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateSystemConfig = async (updates: SystemConfig) => {
    try {
        const response = await axiosInstance.put('/system-config', updates);
        return response.data;
    } catch (error) {
        throw error;
    }
};
