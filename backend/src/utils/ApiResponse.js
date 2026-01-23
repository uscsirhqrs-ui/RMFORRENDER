/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

class ApiResponse {
    constructor(statusCode, message="Success", data = null) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.success = statusCode >= 200 && statusCode < 300;
    }

    toJSON() {
        return {
            success: this.success,
            statuscode:this.statusCode,
            message: this.message,
            data: this.data
        };
    }
}

export {ApiResponse};