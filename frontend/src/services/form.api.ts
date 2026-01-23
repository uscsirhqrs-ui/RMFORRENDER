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

interface ApiResponse {
    success: boolean;
    message: string;
    data?: any;
}

export const createFormTemplate = async (payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/templates`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to create template",
        };
    }
};

export const updateFormTemplate = async (id: string, payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.patch<ApiResponse>(`/forms/templates/${id}`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to update template",
        };
    }
};

export const getFormTemplates = async (mineOnly: boolean = false): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/forms/templates${mineOnly ? '?mineOnly=true' : ''}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch templates",
        };
    }
};

export const getFormTemplateById = async (id: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/forms/templates/${id}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch template details",
        };
    }
};

export const submitFormData = async (payload: { templateId: string; data: any }): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/submit`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to submit data",
        };
    }
};

export const deleteFormTemplate = async (id: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.delete<ApiResponse>(`/forms/templates/${id}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to delete template",
        };
    }
};

export const cloneFormTemplate = async (id: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/templates/${id}/clone`, {});
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to clone template",
        };
    }
};

export const shareTemplateCopy = async (id: string, targetUserIds: string[], deadline?: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/templates/${id}/share-copy`, { targetUserIds, deadline });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to share template copies",
        };
    }
};

// Update form data (edit response)
export const updateFormData = async (payload: { templateId: string, data: any }) => {
    try {
        const response = await axiosInstance.patch('/forms/submit', payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to update form data'
        };
    }
};

export const getFormSubmissions = async (templateId: string) => {
    try {
        const response = await axiosInstance.get(`/forms/templates/${templateId}/submissions`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to fetch submissions'
        };
    }
};

export const getSharedWithMe = async (params?: any): Promise<ApiResponse> => {
    try {
        const queryString = params ? new URLSearchParams(params as any).toString() : '';
        const response = await axiosInstance.get<ApiResponse>(`/forms/shared/with-me?${queryString}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch shared forms",
        };
    }
};

export const getSharedByMe = async (params?: any): Promise<ApiResponse> => {
    try {
        const queryString = params ? new URLSearchParams(params as any).toString() : '';
        const response = await axiosInstance.get<ApiResponse>(`/forms/shared/by-me?${queryString}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch distributed forms",
        };
    }
};

export const toggleArchiveStatus = async (id: string, archive: boolean): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.patch<ApiResponse>(`/forms/templates/${id}/archive`, { archive });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to update archive status",
        };
    }
};

// Blueprint APIs

export const createBlueprint = async (payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/blueprints`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to create blueprint",
        };
    }
};

export const getBlueprints = async (mineOnly: boolean = false): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/blueprints${mineOnly ? '?mineOnly=true' : ''}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch blueprints",
        };
    }
};

export const getBlueprintById = async (id: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/blueprints/${id}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to fetch blueprint details",
        };
    }
};

export const deleteBlueprint = async (id: string): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.delete<ApiResponse>(`/blueprints/${id}`);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to delete blueprint",
        };
    }
};
