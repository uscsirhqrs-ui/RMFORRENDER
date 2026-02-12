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
