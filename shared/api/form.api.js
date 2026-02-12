import axiosInstance from "./axiosInstance";

export const getSharedWithMeForms = async (page = 1, limit = 10, search = "") => {
    try {
        const response = await axiosInstance.get(`/forms/shared-with-me?page=${page}&limit=${limit}&search=${search}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching shared forms:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch forms" };
    }
};

export const getFormTemplate = async (templateId) => {
    try {
        const response = await axiosInstance.get(`/forms/templates/${templateId}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching form template:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch template" };
    }
};
