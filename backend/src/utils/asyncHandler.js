/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err)=> next(err));
}

export default asyncHandler





// const asyncHandler = (fn) => async (req, res, next) => {
//   Promise.resolve(fn(req, res, next)).catch(next)
// }   
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.status || 500).json({
//             success: false,
//             message: error.message || "Internal Server Error"
//         })
//     }
// }


// A utility function to handle async route handlers and middleware
// It catches errors and passes them to the next middleware (error handler)