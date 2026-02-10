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

/**
 * Helper to prepare FormData for multipart/form-data submissions.
 * Checks for File objects in the data field.
 */
const prepareFormData = (payload: { templateId: string; data: any; assignmentId?: string }) => {
    const hasFiles = Object.values(payload.data).some(val => val instanceof File);

    if (!hasFiles) return payload;

    const formData = new FormData();
    formData.append("templateId", payload.templateId);
    if (payload.assignmentId) formData.append("assignmentId", payload.assignmentId);

    // Separating files from data
    const dataWithoutFiles: any = {};
    Object.entries(payload.data).forEach(([key, value]) => {
        if (value instanceof File) {
            formData.append(key, value);
        } else {
            dataWithoutFiles[key] = value;
        }
    });

    // Append standard data as JSON string for uniform parsing on backend
    formData.append("data", JSON.stringify(dataWithoutFiles));

    return formData;
};

export const createActiveForm = async (payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/templates`, payload);
        return response.data;
    } catch (error: any) {
        console.error("createActiveForm Error:", error);
        const status = error.response?.status ? ` (Status: ${error.response.status})` : '';
        return {
            success: false,
            message: (error.response?.data?.message || "Failed to create template") + status,
        };
    }
};

export const updateActiveForm = async (id: string, payload: any): Promise<ApiResponse> => {
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

export const getActiveForms = async (mineOnly: boolean = false): Promise<ApiResponse> => {
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

export const getActiveFormById = async (id: string): Promise<ApiResponse> => {
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

export const submitFormData = async (payload: { templateId: string; data: any; assignmentId?: string }): Promise<ApiResponse> => {
    try {
        const body = prepareFormData(payload);
        const headers = body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await axiosInstance.post<ApiResponse>(`/forms/submit`, body, { headers });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to submit data",
        };
    }
};

export const deleteActiveForm = async (id: string): Promise<ApiResponse> => {
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

export const cloneActiveForm = async (id: string): Promise<ApiResponse> => {
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
export const updateFormData = async (payload: { templateId: string, data: any, assignmentId?: string }) => {
    try {
        const body = prepareFormData(payload);
        const headers = body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await axiosInstance.put('/forms/submit', body, { headers });
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
        const response = await axiosInstance.get(`/forms/responses/${templateId}`);
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
        const response = await axiosInstance.get<ApiResponse>(`/forms/shared-with-me?${queryString}`);
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
        const response = await axiosInstance.get<ApiResponse>(`/forms/shared-by-me?${queryString}`);
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

export const sendReminder = async (id: string, targetUserIds: string[]): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/forms/templates/${id}/remind`, { targetUserIds });
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to send reminders",
        };
    }
};

// Workflow APIs
export const delegateForm = async (payload: { templateId: string; assignedToId: string; remarks?: string; parentAssignmentId?: string }) => {



    try {
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/delegate', payload);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to delegate form' };
    }
};

export const markBackForm = async (payload: { assignmentId: string; remarks?: string; dataId?: string; returnToId?: string }) => {
    try {
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/mark-back', payload);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to mark back form' };
    }
};

export const approveForm = async (payload: { assignmentId: string; remarks?: string; finalize?: boolean }) => {
    try {
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/approve', payload);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to approve form' };
    }
};

export const markFormFinal = async (payload: { assignmentId: string; remarks?: string }) => {
    try {
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/mark-final', payload);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to mark form as final' };
    }
};

export const finalizeAndSubmitToDistributor = async (payload: { assignmentId: string; remarks?: string }) => {
    try {
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/submit-distributor', payload);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to submit to distributor' };
    }
};

export const saveFormDraft = async (payload: { templateId: string; data: any; assignmentId?: string }) => {
    try {
        const body = prepareFormData(payload);
        const headers = body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await axiosInstance.post<ApiResponse>('/forms/workflow/draft', body, { headers });
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to save draft' };
    }
};

export const getChainDetails = async (assignmentId: string) => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/forms/workflow/chain/${assignmentId}`);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to fetch chain details' };
    }
};

export const getChainByDataId = async (submissionId: string) => {
    try {
        const response = await axiosInstance.get<ApiResponse>(`/forms/workflow/chain/submission/${submissionId}`);
        return response.data;
    } catch (error: any) {
        return { success: false, message: error.response?.data?.message || 'Failed to fetch chain details' };
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

export const shareBlueprintCopy = async (id: string, payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.post<ApiResponse>(`/blueprints/${id}/share-copy`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to share blueprint",
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

export const updateBlueprint = async (id: string, payload: any): Promise<ApiResponse> => {
    try {
        const response = await axiosInstance.patch<ApiResponse>(`/blueprints/${id}`, payload);
        return response.data;
    } catch (error: any) {
        return {
            success: false,
            message: error.response?.data?.message || "Failed to update blueprint",
        };
    }
};

