/**
 * @fileoverview Type Definition - Generic API response structure
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-14
 */

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
}
