import axios from 'axios';
import { API_BASE_URL } from '../constants';

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

let tokenProvider = async () => null;

export const setTokenProvider = (provider) => {
    tokenProvider = provider;
};

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

axiosInstance.interceptors.request.use(
    async (config) => {
        try {
            const token = await tokenProvider();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (e) {
            console.error("Error getting token:", e);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest._skipAuthRefresh) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(_token => {
                    return axiosInstance(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh token
                await axios.post(`${API_BASE_URL}/users/refresh-token`, {}, { withCredentials: true });

                processQueue(null);

                return axiosInstance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
