/**
 * @fileoverview API Service - Handles HTTP client requests
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { API_BASE_URL } from "../constants.ts";

/**
 * Helper to safely handle fetch responses.
 * Detects non-JSON responses and provides better error messages.
 */
const handleResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        // Fallback for non-JSON responses (usually server crashes serving HTML)
        const text = await response.text();
        console.error("Non-JSON response received:", text.slice(0, 500));
        throw new Error(`Server Error (Status ${response.status}): The server returned a non-JSON response. This usually indicates a backend crash or misconfiguration.`);
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `API Error: ${response.statusText}`);
    }

    return data;
};


export const getDashboardStats = async () => {
    console.log("Fetching dashboard stats...");
    const url = new URL(`${API_BASE_URL}/references/global/getDashboardStats`);
    const response = await fetch(url.toString(), { credentials: 'include' });
    return handleResponse(response);
};

export const getReferenceFilters = async (params: { isArchived?: boolean, isHidden?: boolean } = {}) => {
    console.log("Fetching reference filters...", params);
    const url = new URL(`${API_BASE_URL}/references/global/getFilters`);
    if (params.isArchived !== undefined) url.searchParams.append('isArchived', String(params.isArchived));
    if (params.isHidden !== undefined) url.searchParams.append('isHidden', String(params.isHidden));

    const response = await fetch(url.toString(), { credentials: 'include' });
    return handleResponse(response);
};

/**
 * Fetches all references from the backend.
 * @param page - The page number (default: 1)
 * @param limit - Number of items per page (default: 10)
 * @returns {Promise<any>} The response data containing references and pagination metadata.
 */
export const getAllReferences = async (
    page: number = 1,
    limit: number = 10,
    filters: Record<string, any> = {},
    sort: { sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}
) => {

    console.log("Fetching references with filters/sort...", { page, limit, filters, sort });

    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...sort
    });

    // Handle array filters (like status, priority) by joining them or repeating keys
    // For simplicity, we'll join them with commas as supported by the updated backend
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            if (value.length > 0) {
                queryParams.append(key, value.join(','));
            }
            // Else: Do nothing (don't append anything implies "All")
        } else if (value !== "") {
            queryParams.append(key, value.toString());
        }
    });

    const response = await fetch(`${API_BASE_URL}/references/global/getAllReferences?${queryParams}`, { credentials: 'include' });
    return handleResponse(response);
};

export const addReference = async (reference: { subject: string; eofficeNo?: string; remarks: string; status: string; priority: string; markedTo: string; tags: string[]; deliveryMode?: string; deliveryDetails?: string; sentAt?: string }) => {
    // The backend route is /createReference under /api/v1/references
    const response = await fetch(`${API_BASE_URL}/references/global/createReference`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reference),
        credentials: 'include'
    });

    return handleResponse(response);
};

/**
 * Fetches a single reference by ID.
 * @param id - The ID of the reference to fetch.
 * @returns {Promise<any>} The response data containing reference details.
 */
export const getReferenceById = async (id: string) => {

    console.log("Fetching reference details from backend API...");
    console.log("ID: ", id);
    // Use query param to prevent caching
    const response = await fetch(`${API_BASE_URL}/references/global/getReferenceById/${id}?t=${new Date().getTime()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    });
    return handleResponse(response);
};

/**
 * Updates an existing reference.
 * 
 * @param id - The ID of the reference to update.
 * @param reference - The reference data to update.
 * @returns {Promise<any>} The response data from the backend.
 */
export const updateReference = async (id: string, reference: Partial<{ subject: string; eofficeNo?: string; remarks: string; status: string; priority: string; markedTo: string; tags: string[]; deliveryMode?: string; deliveryDetails?: string; sentAt?: string }>) => {
    const response = await fetch(`${API_BASE_URL}/references/global/updateReference/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reference),
        credentials: 'include'
    });

    return handleResponse(response);
};

/**
 * Performs bulk updates on multiple references.
 * 
 * @param ids - Array of reference IDs to update.
 * @param action - Action to perform ('hide', 'unhide', 'archive', 'unarchive').
 * @returns {Promise<any>} The response data from the backend.
 */
export const bulkUpdateReferences = async (ids: string[], action: string, force?: boolean, data?: any) => {
    const response = await fetch(`${API_BASE_URL}/references/global/bulkUpdate`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, action, force, ...data }),
        credentials: 'include'
    });

    return handleResponse(response);
};

/**
 * Issues a reminder for a reference.
 * 
 * @param referenceId - The ID of the reference.
 * @param userIds - Array of user IDs to send the reminder to.
 * @param remarks - Remarks to include in the reminder.
 * @param priority - Priority of the reminder.
 * @returns {Promise<any>} The response data from the backend.
 */
export const issueReminder = async (referenceId: string, userIds: string[], remarks: string, priority: string) => {
    const response = await fetch(`${API_BASE_URL}/references/global/issueReminder`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referenceId, userIds, remarks, priority }),
        credentials: 'include'
    });

    return handleResponse(response);
};

/**
 * Requests to reopen a closed reference.
 * 
 * @param referenceId - The ID of the reference.
 * @param remarks - Reason for reopening.
 * @returns {Promise<any>} The response data from the backend.
 */
export const requestReopen = async (referenceId: string, remarks: string) => {
    const response = await fetch(`${API_BASE_URL}/references/global/${referenceId}/request-reopen`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks }),
        credentials: 'include'
    });

    return handleResponse(response);
};

/**
 * Handles the action (approve/reject) for a reopening request.
 * 
 * @param referenceId - The ID of the reference.
 * @param action - The action to perform ('approve' or 'reject').
 * @param reason - The reason for rejection (optional for approval).
 * @returns {Promise<any>} The response data from the backend.
 */
export const handleReopenAction = async (referenceId: string, action: 'approve' | 'reject', reason?: string) => {
    const response = await fetch(`${API_BASE_URL}/references/global/${referenceId}/handle-reopen-request`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, reason }),
        credentials: 'include'
    });

    return handleResponse(response);
};


/**
 * Deletes a reference by ID.
 * 
 * @param id - The ID of the reference to delete.
 * @returns {Promise<any>} The response data from the backend.
 */
export const deleteReference = async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/references/global/deleteReference/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    });

    return handleResponse(response);
};
