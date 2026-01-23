/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

class ApiErrors extends Error {
    constructor(
        message = "Internal Server Error",
        statusCode,
        errors = [],
        stackt = ""

    ) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        this.data = null;
        this.success = false;
        this.errors = errors;
       
        if (stackt) {
            this.stack = stackt;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        } 
    }
}
export default ApiErrors