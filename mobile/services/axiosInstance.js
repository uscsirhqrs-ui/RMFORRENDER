// Re-export the shared axiosInstance and setTokenProvider
// The shared instance already has request/response interceptors configured
import axiosInstance, { setTokenProvider } from '../../shared/api/axiosInstance';
export { setTokenProvider };
export default axiosInstance;
