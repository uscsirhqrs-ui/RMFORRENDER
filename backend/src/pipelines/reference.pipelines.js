/**
 * @fileoverview MongoDB Pipeline - Aggregation pipeline definitions
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { lookupUserStage } from "./common.stages.js";

/**
 * Pipeline to fetch references with fully populated user details.
 * Optimized for performance by using denormalized fields where possible.
 * 
 * @param {Object} matchCriteria - Optional $match criteria.
 * @returns {Array} The aggregation pipeline.
 */
export const getReferencesWithDetailsPipeline = (matchCriteria = {}) => {
    return [
        {
            $match: matchCriteria
        },
        {
            $addFields: {
                daysSinceCreated: {
                    $round: [{ $divide: [{ $subtract: ["$$NOW", "$createdAt"] }, 1000 * 60 * 60 * 24] }, 0]
                }
            }
        },
        {
            $project: {
                subject: 1,
                refId: 1,
                status: 1,
                priority: 1,
                createdAt: 1,
                updatedAt: 1,
                daysSinceCreated: 1,
                createdBy: 1,
                markedTo: 1,
                createdByDetails: 1,
                markedToDetails: 1,
                markedToDivision: 1,
                pendingDivision: "$markedToDivision",
                pendingLab: { $arrayElemAt: ["$markedToDetails.labName", 0] },
                createdLab: "$createdByDetails.labName",
                remarks: 1,
                eofficeNo: 1,
                deliveryMode: 1,
                deliveryDetails: 1,
                sentAt: 1,
                isHidden: 1,
                isArchived: 1,
                labName: 1,
                reopenRequest: 1
            }
        }
    ];
};

/**
 * Pipeline to calculate statistics for references.
 * Leverages indexes for speed.
 * 
 * @returns {Array} The aggregation pipeline.
 */
export const getReferenceStatsPipeline = () => {
    return [
        {
            $facet: {
                byStatus: [
                    { $group: { _id: "$status", count: { $sum: 1 } } }
                ],
                byPriority: [
                    { $group: { _id: "$priority", count: { $sum: 1 } } }
                ],
                totalCount: [
                    { $count: "count" }
                ]
            }
        }
    ];
};
