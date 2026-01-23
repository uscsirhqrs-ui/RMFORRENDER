/**
 * @fileoverview MongoDB Pipeline - Aggregation pipeline definitions
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

/**
 * Pipeline to get basic user activity stats (placeholder example).
 * Could be expanded to join with References/Movements to see workload.
 * 
 * @returns {Array} The aggregation pipeline.
 */
export const getUserActivityPipeline = () => {
    return [
        {
            $project: {
                fullName: 1,
                email: 1,
                role: 1
            }
        }
        // Add more stages as needed, e.g., lookup tasks assigned to user
    ];
};
