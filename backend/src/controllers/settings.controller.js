/**
 * @fileoverview API Controller - Handles HTTP requests and business logic
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import asyncHandler from "../utils/asyncHandler.js";
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../constants.js";
import ApiErrors from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { SystemConfig } from "../models/systemConfig.model.js";

const ALLOWED_DOMAINS_KEY = "ALLOWED_DOMAINS";
const LABS_KEY = "LABS";
const DESIGNATIONS_KEY = "DESIGNATIONS";
const DIVISIONS_KEY = "DIVISIONS";
const FEATURE_PERMISSIONS_KEY = "FEATURE_PERMISSIONS";

export const DEFAULT_ALLOWED_DOMAINS = ["csir.res.in"];

export const DEFAULT_LABS = [
    "CSIR-HQRS", "CSIR-AMPRI", "CSIR-CBRI", "CSIR-CCMB", "CSIR-CDRI", "CSIR-CECRI",
    "CSIR-CEERI", "CSIR-CFTRI", "CSIR-CGCRI", "CSIR-CIMFR", "CSIR-CIMAP",
    "CSIR-CLRI", "CSIR-CMERI", "CSIR-CRRI", "CSIR-CSIO", "CSIR-CSMCRI",
    "CSIR-IGIB", "CSIR-IHBT", "CSIR-IICB", "CSIR-IICT", "CSIR-IIIM",
    "CSIR-IIP", "CSIR-IITR", "CSIR-IMMT", "CSIR-IMTECH", "CSIR-NAL",
    "CSIR-NBRI", "CSIR-NCL", "CSIR-NEERI", "CSIR-NEIST", "CSIR-NGRI",
    "CSIR-NIIST", "CSIR-NIO", "CSIR-NISCPR", "CSIR-NML", "CSIR-NPL",
    "CSIR-SERC", "CSIR-4PI", "CSIR-CMC (MADRAS COMPLEX)", "CSIR-HRDC",
    "CSIR-URDIP"
];

export const DEFAULT_DESIGNATIONS = [
    "Director General-CSIR",
    "Distinguished Scientist",
    "Outstanding Scientist",
    "Joint Secretary(Admin)",
    "Financial Advisor",
    "Chief Vigilance Officer",
    "Legal Advisor",
    "Chief Engineer",
    "Director",
    "Chief Scientist",
    "Sr. Principal Scientist",
    "Principal Scientist",
    "Senior Scientist",
    "Scientist",
    "Junior Scientist",
    "Sr. Dy.Financial Adviser",
    "Dy. Financial Adviser",
    "Sr. Dy.Secretary",
    "Dy. Secretary",
    "Under Secretary",
    "Sr. Controller Of Administration",
    "Sr. Controller Of Finance And Accounts",
    "Sr. Controller Of Stores And Purchase",
    "Controller Of Administration",
    "Controller Of Finance And Accounts",
    "Controller Of Stores And Purchase",
    "Administrative Officer",
    "Finance And Account Officer",
    "Stores And Purchase Officer",
    "Section Officer(G)",
    "Section Officer(F&A)",
    "Section Officer(S&P)",
    "Assistant Section Officer(G)",
    "Assistant Section Officer(F&A)",
    "Assistant Section Officer(S&P)",
    "Senior Secretariat Assistant(G)",
    "Senior Secretariat Assistant(F&A)",
    "Senior Secretariat Assistant(S&P)",
    "Junior Secretariat Assistant(G)",
    "Junior Secretariat Assistant(F&A)",
    "Junior Secretariat Assistant(S&P)",
    "Principal Staff Officer",
    "Principal Private Secretary",
    "Private Secretary",
    "Senior Stenographer",
    "Junior Stenographer",
    "Senior Hindi Officer",
    "Hindi Officer",
    "Principal Technical Officer",
    "Senior Technical Officer I",
    "Senior Technical Officer II",
    "Senior Technical Officer III",
    "Technical Officer",
    "Senior Technician I",
    "Senior Technician II",
    "Senior Technician III",
    "Security Assistant",
    "Security Officer",
    "Senior Hindi Translator",
    "Technical Assistant",
    "Technician I",
    "Technician II"
];

export const DEFAULT_DIVISIONS = [
    "HR-I",
    "HR-II",
    "HR-III",
    "Central Office",
    "Recruitment Section",
    "PME/BDG",
    "General Section",
    "Establishment Section",
    "Legal Section",
    "Vigilance Section",
    "Finance and Accounts",
    "Stores and Purchase",
    "Director Office",
    "Office of DG CSIR",
    "Office of JS(Admin) CSIR",
    "Office of FA CSIR",
];

/**
 * Get allowed domains for registration/login
 */

const DEFAULT_FEATURE_PERMISSIONS = [
    {
        feature: FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER,
        label: "Add/Update/View References(own lab)",
        roles: ["User", "Inter Lab sender"],
        description: "Add, update, and view references within own lab"
    },
    {
        feature: FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER,
        label: "Add/Update/View References(inter lab)",
        roles: ["Inter Lab sender"],
        description: "Add, update, and view references across different labs"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE,
        label: "Manage Local References(own lab)",
        roles: ["Delegated Admin", "Superadmin"],
        description: "Manage local references within own lab (Admin level)"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES,
        label: "Manage Local References (all labs)",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage local references across all labs (Superadmin level)"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES,
        label: "Manage Global References",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage global (inter-lab) references"
    },
    {
        feature: FeatureCodes.FEATURE_FORM_MANAGEMENT,
        label: "Form Management",
        roles: ["User", "Inter Lab sender", "Superadmin"],
        description: "Create forms, share forms, share templates"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE,
        label: "Manage Users(own lab)",
        roles: ["Superadmin", "Delegated Admin"],
        description: "Manage users within own lab"
    },
    {
        feature: FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES,
        label: "Manage Users(all labs)",
        roles: [SUPERADMIN_ROLE_NAME],
        description: "Manage users across all labs"
    },
    {
        feature: FeatureCodes.FEATURE_AUDIT_TRAILS,
        label: "Audit Trails",
        roles: [SUPERADMIN_ROLE_NAME],/* DO NOT ADD ANY ROLE HERE */
        description: "View audit trails"
    },
    {
        feature: FeatureCodes.FEATURE_SYSTEM_CONFIGURATION,
        label: "System Configuration",
        roles: [SUPERADMIN_ROLE_NAME],/* DO NOT ADD ANY ROLE HERE */
        description: "Manage system configurations"
    }
];

/**
 * Get allowed domains for registration/login
 */
const getAllowedDomains = asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: ALLOWED_DOMAINS_KEY });

    if (!config) {
        config = await SystemConfig.create({
            key: ALLOWED_DOMAINS_KEY,
            value: DEFAULT_ALLOWED_DOMAINS,
            description: "List of email domains allowed for registration and login"
        });
    }

    const allowedDomains = config.value;

    return res.status(200).json(
        new ApiResponse(200, "Allowed domains fetched successfully", { allowedDomains })
    );
});

/**
 * Update allowed domains list (Super Admin only)
 */
const updateAllowedDomains = asyncHandler(async (req, res) => {
    const { allowedDomains } = req.body;

    if (!Array.isArray(allowedDomains)) {
        throw new ApiErrors("allowedDomains must be an array of strings", 400);
    }

    // Ensure uniqueness and clean data
    const uniqueDomains = [...new Set(allowedDomains
        .map(d => d.trim().toLowerCase())
        .filter(d => d !== "")
    )];

    const config = await SystemConfig.findOneAndUpdate(
        { key: ALLOWED_DOMAINS_KEY },
        {
            $set: {
                key: ALLOWED_DOMAINS_KEY,
                value: uniqueDomains,
                description: "List of email domains allowed for registration and login"
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "Allowed domains updated successfully", { allowedDomains: config.value })
    );
});

/**
 * Get Labs list
 */
const getLabs = asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: LABS_KEY });

    if (!config) {
        // Initialize with defaults if not present
        config = await SystemConfig.create({
            key: LABS_KEY,
            value: DEFAULT_LABS,
            description: "List of CSIR Labs / Institutions"
        });
    } else {
        // Sync with defaults to add any new labs
        const currentLabs = config.value;
        const missingLabs = DEFAULT_LABS.filter(l => !currentLabs.includes(l));
        if (missingLabs.length > 0) {
            config.value = [...currentLabs, ...missingLabs];
            config.markModified('value');
            await config.save();
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Labs fetched successfully", { labs: config.value.sort() })
    );
});

/**
 * Update Labs list (Super Admin only)
 */
const updateLabs = asyncHandler(async (req, res) => {
    const { labs } = req.body;

    if (!Array.isArray(labs)) {
        throw new ApiErrors("labs must be an array of strings", 400);
    }

    // Ensure uniqueness and clean data
    const uniqueLabs = [...new Set(labs
        .map(l => l.trim())
        .filter(l => l !== "")
    )];

    const config = await SystemConfig.findOneAndUpdate(
        { key: LABS_KEY },
        {
            $set: {
                key: LABS_KEY,
                value: uniqueLabs,
                description: "List of CSIR Labs / Institutions"
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "Labs updated successfully", { labs: config.value })
    );
});

/**
 * Get Designations list
 */
const getDesignations = asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: DESIGNATIONS_KEY });

    if (!config) {
        // Initialize with defaults if not present
        config = await SystemConfig.create({
            key: DESIGNATIONS_KEY,
            value: DEFAULT_DESIGNATIONS,
            description: "List of standard designations"
        });
    } else {
        // Sync with defaults
        const currentDesigs = config.value;
        const missingDesigs = DEFAULT_DESIGNATIONS.filter(d => !currentDesigs.includes(d));
        if (missingDesigs.length > 0) {
            config.value = [...currentDesigs, ...missingDesigs];
            config.markModified('value');
            await config.save();
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Designations fetched successfully", { designations: config.value })
    );
});

/**
 * Update Designations list (Super Admin only)
 */
const updateDesignations = asyncHandler(async (req, res) => {
    const { designations } = req.body;

    if (!Array.isArray(designations)) {
        throw new ApiErrors("designations must be an array of strings", 400);
    }

    // Ensure uniqueness and clean data
    const uniqueDesignations = [...new Set(designations
        .map(d => d.trim())
        .filter(d => d !== "")
    )];

    const config = await SystemConfig.findOneAndUpdate(
        { key: DESIGNATIONS_KEY },
        {
            $set: {
                key: DESIGNATIONS_KEY,
                value: uniqueDesignations,
                description: "List of standard designations"
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "Designations updated successfully", { designations: config.value })
    );
});

/**
 * Get Divisions list
 */
const getDivisions = asyncHandler(async (req, res) => {
    let config = await SystemConfig.findOne({ key: DIVISIONS_KEY });

    if (!config) {
        // Initialize with defaults if not present
        config = await SystemConfig.create({
            key: DIVISIONS_KEY,
            value: DEFAULT_DIVISIONS,
            description: "List of divisions / sections"
        });
    } else {
        // Sync with defaults
        const currentDivisions = config.value;
        const missingDivisions = DEFAULT_DIVISIONS.filter(d => !currentDivisions.includes(d));
        if (missingDivisions.length > 0) {
            config.value = [...currentDivisions, ...missingDivisions];
            config.markModified('value');
            await config.save();
        }
    }

    return res.status(200).json(
        new ApiResponse(200, "Divisions fetched successfully", { divisions: config.value.sort() })
    );
});

/**
 * Update Divisions list (Super Admin only)
 */
const updateDivisions = asyncHandler(async (req, res) => {
    const { divisions } = req.body;

    if (!Array.isArray(divisions)) {
        throw new ApiErrors("divisions must be an array of strings", 400);
    }

    // Ensure uniqueness and clean data
    const uniqueDivisions = [...new Set(divisions
        .map(d => d.trim())
        .filter(d => d !== "")
    )];

    const config = await SystemConfig.findOneAndUpdate(
        { key: DIVISIONS_KEY },
        {
            $set: {
                key: DIVISIONS_KEY,
                value: uniqueDivisions,
                description: "List of divisions / sections"
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "Divisions updated successfully", { divisions: config.value })
    );
});

/**
 * Get Feature Permissions
 */
const getFeaturePermissions = asyncHandler(async (req, res) => {
    console.log('[Controller] Fetching feature permissions...');
    let config = await SystemConfig.findOne({ key: FEATURE_PERMISSIONS_KEY });

    if (!config) {
        config = await SystemConfig.create({
            key: FEATURE_PERMISSIONS_KEY,
            value: DEFAULT_FEATURE_PERMISSIONS,
            description: "Role-based feature access permissions"
        });
    }

    // Create a map of existing permissions from DB to preserve assigned roles
    const dbPermissionsMap = new Map(config.value.map(p => [p.feature, p.roles]));

    // Reconstruct config value based entirely on DEFAULT_FEATURE_PERMISSIONS to ensure:
    // 1. Correct Order
    // 2. Removal of deprecated features (e.g. "Manage Users")
    // 3. Addition of new features
    const newConfigValue = DEFAULT_FEATURE_PERMISSIONS.map(def => ({
        feature: def.feature,
        label: def.label,
        description: def.description,
        roles: dbPermissionsMap.get(def.feature) || def.roles
    }));

    config.value = newConfigValue;
    config.markModified('value');
    await config.save();
    console.log('[Controller] Synced feature permissions with defaults.');

    console.log('[Controller] Returning permissions:', JSON.stringify(config.value, null, 2));

    return res.status(200).json(
        new ApiResponse(200, "Feature permissions fetched successfully", { permissions: config.value })
    );
});

/**
 * Update Feature Permissions
 */
const updateFeaturePermissions = asyncHandler(async (req, res) => {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
        throw new ApiErrors("permissions must be an array", 400);
    }

    const config = await SystemConfig.findOneAndUpdate(
        { key: FEATURE_PERMISSIONS_KEY },
        {
            $set: {
                key: FEATURE_PERMISSIONS_KEY,
                value: permissions,
                description: "Role-based feature access permissions"
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(
        new ApiResponse(200, "Feature permissions updated successfully", { permissions: config.value })
    );
});

export {
    getAllowedDomains,
    updateAllowedDomains,
    getLabs,
    updateLabs,
    getDesignations,
    updateDesignations,
    getDivisions,
    updateDivisions,
    getFeaturePermissions,
    updateFeaturePermissions
};
