import axiosInstance from "./axiosInstance";

export const getFeaturePermissions = async () => {
    try {
        const response = await axiosInstance.get(`/settings/feature-permissions`);
        return { success: true, data: response.data.data };
    } catch (error) {
        console.error("Error fetching feature permissions:", error);
        return { success: false, data: { permissions: [] } };
    }
};
