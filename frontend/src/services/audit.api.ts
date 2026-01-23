/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import axios from 'axios';

import { API_BASE_URL } from '../constants';

export const getAuditLogs = async (params = {}) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/audit`, {
            params,
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching audit logs:", error);
        throw error;
    }
};
export const getAuditSettings = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/audit/settings`, {
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching audit settings:", error);
        throw error;
    }
};

export const toggleAuditLogging = async () => {
    try {
        const response = await axios.post(`${API_BASE_URL}/audit/toggle`, {}, {
            withCredentials: true
        });
        return response.data;
    } catch (error) {
        console.error("Error toggling audit logging:", error);
        throw error;
    }
};
