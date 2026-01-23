/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import axiosInstance from "./axiosInstance";
import { toast } from "react-hot-toast";

// API_URL is handled by axiosInstance


interface AllowedDomainsResponse {
    allowedDomains: string[];
}

const getAllowedDomains = async (): Promise<{ success: boolean; data: AllowedDomainsResponse }> => {
    try {
        const response = await axiosInstance.get(`/settings/allowed-domains`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error fetching allowed domains:", error);
        return { success: false, data: { allowedDomains: [] } };
    }
};

const updateAllowedDomains = async (allowedDomains: string[]): Promise<{ success: boolean; data: any }> => {
    try {
        const response = await axiosInstance.put(
            `/settings/allowed-domains`,
            { allowedDomains }
        );
        toast.success("Security settings updated successfully");
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error updating allowed domains:", error);
        toast.error(error.response?.data?.message || "Failed to update settings");
        return { success: false, data: null };
    }
};

const getLabs = async (): Promise<{ success: boolean; data: { labs: string[] } }> => {
    try {
        const response = await axiosInstance.get(`/settings/labs`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error fetching labs:", error);
        return { success: false, data: { labs: [] } };
    }
};

const updateLabs = async (labs: string[]): Promise<{ success: boolean; data: any }> => {
    try {
        const response = await axiosInstance.put(`/settings/labs`, { labs });
        toast.success("Labs list updated successfully");
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error updating labs:", error);
        toast.error(error.response?.data?.message || "Failed to update labs");
        return { success: false, data: null };
    }
};

const getDesignations = async (): Promise<{ success: boolean; data: { designations: string[] } }> => {
    try {
        const response = await axiosInstance.get(`/settings/designations`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error fetching designations:", error);
        return { success: false, data: { designations: [] } };
    }
};

const updateDesignations = async (designations: string[]): Promise<{ success: boolean; data: any }> => {
    try {
        const response = await axiosInstance.put(`/settings/designations`, { designations });
        toast.success("Designations list updated successfully");
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error updating designations:", error);
        toast.error(error.response?.data?.message || "Failed to update designations");
        return { success: false, data: null };
    }
};

const getDivisions = async (): Promise<{ success: boolean; data: { divisions: string[] } }> => {
    try {
        const response = await axiosInstance.get(`/settings/divisions`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error fetching divisions:", error);
        return { success: false, data: { divisions: [] } };
    }
};

const updateDivisions = async (divisions: string[]): Promise<{ success: boolean; data: any }> => {
    try {
        const response = await axiosInstance.put(`/settings/divisions`, { divisions });
        toast.success("Divisions list updated successfully");
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error updating divisions:", error);
        toast.error(error.response?.data?.message || "Failed to update divisions");
        return { success: false, data: null };
    }
};

const getFeaturePermissions = async (): Promise<{ success: boolean; data: { permissions: any[] } }> => {
    try {
        const response = await axiosInstance.get(`/settings/feature-permissions`);
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error fetching feature permissions:", error);
        return { success: false, data: { permissions: [] } };
    }
};

const updateFeaturePermissions = async (permissions: any[]): Promise<{ success: boolean; data: any }> => {
    try {
        const response = await axiosInstance.put(`/settings/feature-permissions`, { permissions });
        toast.success("Feature permissions updated successfully");
        return { success: true, data: response.data.data };
    } catch (error: any) {
        console.error("Error updating feature permissions:", error);
        toast.error(error.response?.data?.message || "Failed to update feature permissions");
        return { success: false, data: null };
    }
};

export {
    getAllowedDomains,
    updateAllowedDomains,
    getLabs,
    updateLabs,
    getDesignations,
    updateDesignations,
    getDivisions,
    updateDivisions,
    getFeaturePermissions,
    updateFeaturePermissions
};
