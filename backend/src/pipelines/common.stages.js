/**
 * @fileoverview MongoDB Stages - Common aggregation stages
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

/**
 * Creates a standard $lookup stage to join User details.
 * @param {string} localField - The field in the local collection (e.g., 'markedTo').
 * @param {string} asField - The field to output the joined document (e.g., 'markedToDetails').
 * @param {boolean} unwind - Whether to unwind the result (default: true, assumes 1:1 relationship).
 * @returns {Array} Array of pipeline stages.
 */
export const lookupUserStage = (localField, asField, unwind = true) => {
    const stages = [
        {
            $lookup: {
                from: 'users',
                localField: localField,
                foreignField: '_id',
                as: asField,
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            email: 1,
                            labName: 1,
                            designation: 1,
                            division: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        }
    ];

    if (unwind) {
        stages.push({
            $unwind: {
                path: `$${asField}`,
                preserveNullAndEmptyArrays: true
            }
        });
    }

    return stages;
};
