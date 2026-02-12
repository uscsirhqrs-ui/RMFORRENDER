/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import axiosInstance from './axiosInstance';

export const generateAIForm = async (prompt: string) => {
    try {
        const response = await axiosInstance.post('/ai/generate-form', { prompt });
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: 'AI generation failed' };
    }
};

export const getAIUsage = async () => {
    try {
        const response = await axiosInstance.get('/ai/usage');
        return response.data;
    } catch (error: any) {
        return error.response?.data || { success: false, message: 'Failed to fetch AI usage' };
    }
};
