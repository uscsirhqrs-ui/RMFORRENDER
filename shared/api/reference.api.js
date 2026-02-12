import axiosInstance from "./axiosInstance";

export const getGlobalReferences = async (page = 1, limit = 10, search = "") => {
    try {
        const response = await axiosInstance.get(`/references/global/getAllReferences?page=${page}&limit=${limit}&search=${search}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching global references:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch global references" };
    }
};

export const getLocalReferences = async (page = 1, limit = 10, search = "") => {
    try {
        const response = await axiosInstance.get(`/references/local?page=${page}&limit=${limit}&search=${search}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching local references:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch local references" };
    }
};

export const getGlobalReferenceById = async (id) => {
    try {
        const response = await axiosInstance.get(`/references/global/getReferenceById/${id}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching global reference:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch reference" };
    }
};

export const getLocalReferenceById = async (id) => {
    try {
        const response = await axiosInstance.get(`/references/local/${id}`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching local reference:", error);
        return { success: false, message: error.response?.data?.message || "Failed to fetch reference" };
    }
};

export const updateGlobalReference = async (id, data) => {
    try {
        const response = await axiosInstance.put(`/references/global/updateReference/${id}`, data);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error updating global reference:", error);
        return { success: false, message: error.response?.data?.message || "Failed to update reference" };
    }
};

export const updateLocalReference = async (id, data) => {
    try {
        const response = await axiosInstance.put(`/references/local/${id}`, data);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error updating local reference:", error);
        return { success: false, message: error.response?.data?.message || "Failed to update reference" };
    }
};
