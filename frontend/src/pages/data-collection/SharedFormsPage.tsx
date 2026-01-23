import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import Button from '../../components/ui/Button';
import {
    FileText, Eye, Trash2,
    Search,
    ArrowUpRight, ArrowDownLeft, X, LayoutGrid, List, AlertCircle, CheckCircle, Sparkles, Clock, Loader2,
    Archive, ChevronLeft, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import {
    getSharedWithMe, getSharedByMe,
    getFormTemplateById, submitFormData, deleteFormTemplate, updateFormTemplate,
    getFormSubmissions, updateFormData, toggleArchiveStatus
} from '../../services/form.api';
import FormSubmissionsView from '../../components/ui/FormSubmissionsView';
import DynamicFormRenderer from '../../components/ui/DynamicFormRenderer';
import UserProfileViewModal from '../../components/ui/UserProfileViewModal';
import { useMessageBox } from '../../context/MessageBoxContext';

export default function SharedFormsPage() {
    const location = useLocation();
    const { showMessage, showConfirm } = useMessageBox();
    const [activeTab, setActiveTab] = useState<'with-me' | 'by-me'>(location.state?.activeTab || 'with-me');
    const [forms, setForms] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Selection state
    const [selectedFormIds, setSelectedFormIds] = useState<Set<string>>(new Set());

    // Modal states
    const [isFillingModalOpen, setIsFillingModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    // const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Removed Grid/List toggle as not priority now? Or conflict? 
    // Wait, previous code had viewMode for Grid/List. I should rename mine or reuse?
    // User requested Archive View.
    // Let's rename my view to 'currentView' (active/archived).
    // And keep 'layoutMode' for grid/list.
    const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');

    // Submissions view state
    const [viewingSubmissionsTemplate, setViewingSubmissionsTemplate] = useState<any | null>(null);

    // Recipients view state
    const [viewingRecipientsForm, setViewingRecipientsForm] = useState<any | null>(null);

    const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Date formatting helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Calculate pending days
    const getPendingDays = (dateString: string) => {
        const start = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const isExpiringSoon = (dateString: string) => {
        if (!dateString) return false;
        const deadline = new Date(dateString);
        const now = new Date();
        const diffTime = deadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
    };

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchForms(1);
    }, [activeTab, viewMode, statusFilter]); // Search should ideally debounce

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPagination(prev => ({ ...prev, page: 1 }));
            fetchForms(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchForms = async (page = pagination.page) => {
        setIsLoading(true);
        try {
            const params = {
                page,
                limit: pagination.limit,
                view: viewMode,
                status: statusFilter,
                search: searchQuery
            };

            const response = activeTab === 'with-me' ? await getSharedWithMe(params) : await getSharedByMe(params);
            if (response.success) {
                setForms(response.data.forms);
                if (response.data.pagination) {
                    setPagination(response.data.pagination);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
            fetchForms(newPage);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedFormIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedFormIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedFormIds.size === forms.length && forms.length > 0) {
            setSelectedFormIds(new Set());
        } else {
            setSelectedFormIds(new Set(forms.map(f => f._id)));
        }
    };

    const handleBulkArchive = async (archive: boolean) => {
        const action = archive ? 'Archive' : 'Restore';
        const confirmed = await showConfirm({
            title: `Confirm ${action}`,
            message: `Are you sure you want to ${action.toLowerCase()} ${selectedFormIds.size} selected form(s)?`,
            type: 'warning',
            confirmText: action,
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            let successCount = 0;
            // Since we don't have a bulk endpoint, we promise.all
            // Industry standard would be a bulk endpoint, but this works for MVP
            const promises = Array.from(selectedFormIds).map(id => toggleArchiveStatus(id, archive));
            const results = await Promise.all(promises);

            successCount = results.filter(r => r.success).length;

            if (successCount > 0) {
                showMessage({
                    title: 'Success',
                    message: `${successCount} forms ${archive ? 'archived' : 'restored'} successfully.`,
                    type: 'success'
                });
                setSelectedFormIds(new Set());
                fetchForms(); // Refresh
            } else {
                showMessage({ title: 'Error', message: "Failed to update forms.", type: 'error' });
            }
        } catch (error) {
            console.error(error);
            showMessage({ title: 'Error', message: "An unexpected error occurred.", type: 'error' });
        }
    };

    const handleFillClick = async (templateId: string) => {
        try {
            const response = await getFormTemplateById(templateId);
            if (response.success) {
                const template = response.data;
                setSelectedTemplate(template);

                // Reset form data initially
                setFormData({});

                // Check if already submitted and if we need to pre-fill
                const isFormActive = template.isActive && (!template.deadline || new Date(template.deadline) > new Date());
                setIsReadOnly(!isFormActive);

                // If the user has already submitted, fetch their submission
                // We know if they submitted based on the 'isSubmitted' flag from the list,
                // but we need the actual data now.
                // The backend getFormSubmissions returns all submissions for the template.
                // If I am not the creator, it returns only mine.
                const submissionsRes = await getFormSubmissions(templateId);
                if (submissionsRes.success && submissionsRes.data.length > 0) {
                    // Assuming the backend returns the user's submission since they are a normal user
                    // The controller logic confirms: if not creator/admin, filter by submittedBy = user._id
                    const mySubmission = submissionsRes.data[0];
                    if (mySubmission) {
                        setFormData(mySubmission.data);
                    }
                }

                setIsFillingModalOpen(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleInputChange = (id: string, value: any) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!selectedTemplate) return;

        setIsSubmitting(true);
        try {
            // Check if we are updating existing data or creating new
            // If the form was already submitted by this user (check the list state or if we pre-filled data)
            // Ideally we should track this state more explicitly, but we can infer or try update first?
            // Actually, we should know if it's an update mode.
            // Let's use the 'activeTab' or 'isSubmitted' property from the form list to know.
            // But 'selectedTemplate' here might not have 'isSubmitted' property passed from the list if fetch details doesn't include it.
            // However, we just fetched submissions above. If we found one, it's an update.

            // To be robust, let's assume if we found data, we are updating. 
            // OR even better, let backend handle upsert? No, keep it explicit.

            // Let's rely on whether we found a submission in handleFillClick. 
            // We can check if getFormSubmissions returned data.
            // Refetching here is wasteful. Let's add a state `isEditMode`.

            const isEdit = forms.find(f => f._id === selectedTemplate._id)?.isSubmitted;

            let response;
            if (isEdit && selectedTemplate.allowMultipleSubmissions === false) {
                response = await updateFormData({
                    templateId: selectedTemplate._id,
                    data: formData
                });
            } else {
                response = await submitFormData({
                    templateId: selectedTemplate._id,
                    data: formData
                });
            }

            if (response.success) {
                showMessage({ title: 'Success', message: isEdit ? "Data updated successfully!" : "Data submitted successfully!", type: 'success' });
                setIsFillingModalOpen(false);
                setFormData({});
                fetchForms();
            } else {
                showMessage({ title: 'Error', message: response.message || 'Submission failed', type: 'error' });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm({
            title: 'Confirm Delete',
            message: "Are you sure you want to delete this distribution? This will remove the template and all submissions.",
            type: 'error',
            confirmText: 'Delete Distribution',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;
        try {
            const response = await deleteFormTemplate(id);
            if (response.success) {
                fetchForms();
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Removed client-side filteredForms logic in favor of server-side
    const displayForms = forms;

    const toggleLiveStatus = async (id: string, currentStatus: boolean) => {
        if (togglingId === id) return;
        setTogglingId(id);
        try {
            const response = await updateFormTemplate(id, { isActive: !currentStatus, notifyUsers: false });
            if (response.success) {
                setForms(prev => prev.map(f => f._id === id ? { ...f, isActive: !currentStatus } : f));

                // If a background task was initiated (for notifications), show a specific message
                if (response.data?.taskId) {
                    showMessage({
                        title: 'Success',
                        message: !currentStatus ? "Form is now LIVE. Notifications are sending in the background." : "Form has been STOPPED.",
                        type: 'success'
                    });
                } else {
                    showMessage({
                        title: 'Success',
                        message: !currentStatus ? "Form is now LIVE and accepting submissions." : "Form has been STOPPED.",
                        type: 'success'
                    });
                }

            } else {
                showMessage({
                    title: 'Error',
                    message: response.message || "Failed to update form status",
                    type: 'error'
                });
            }
        } catch (error) {
            console.error("Failed to toggle live status", error);
            showMessage({
                title: 'Error',
                message: "An unexpected error occurred",
                type: 'error'
            });
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter">Shared Forms</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-bold tracking-widest opacity-60">Collabarative Data Ecosystem</p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        <button
                            onClick={() => setActiveTab('with-me')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'with-me' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
                        >
                            <ArrowDownLeft className="w-4 h-4" />
                            Shared With Me
                        </button>
                        <button
                            onClick={() => setActiveTab('by-me')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'by-me' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Distributed By Me
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find a form..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {/* View Filter (Active/Archived) */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('active')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'active' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Active
                            </button>
                            <button
                                onClick={() => setViewMode('archived')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'archived' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Archived
                            </button>
                        </div>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer min-w-[140px]"
                        >
                            <option value="all">All Status</option>
                            <option value="new">New</option>
                            <option value="pending">Pending</option>
                            <option value="submitted">Submitted</option>
                            <option value="expiring">Expiring Soon</option>
                        </select>
                        <div className="border-l border-gray-200 h-8 mx-2" />

                        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                            <button
                                onClick={() => setLayoutMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${layoutMode === 'grid' ? 'bg-gray-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setLayoutMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${layoutMode === 'list' ? 'bg-gray-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedFormIds.size > 0 && (
                    <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                {selectedFormIds.size}
                            </div>
                            <span className="text-sm font-bold text-indigo-900">Selected</span>
                            {/* Select All Visible helper */}
                            <button onClick={toggleSelectAll} className="text-xs text-indigo-600 underline hover:text-indigo-800">
                                {selectedFormIds.size === forms.length ? "Deselect All" : "Select All Visible"}
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {viewMode === 'active' ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    label="Archive"
                                    icon={<Archive className="w-4 h-4" />}
                                    onClick={() => handleBulkArchive(true)}
                                    className="bg-white"
                                />
                            ) : (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    label="Restore"
                                    icon={<Archive className="w-4 h-4" />} // Maybe different icon for restore?
                                    onClick={() => handleBulkArchive(false)}
                                    className="bg-white"
                                />
                            )}
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : displayForms.length > 0 ? (
                    layoutMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayForms.map((form) => (
                                <Card key={form._id} className={`group hover:shadow-xl transition-all duration-300 border-transparent hover:border-indigo-100 h-full flex flex-col ${selectedFormIds.has(form._id) ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
                                    <CardHeader className={`${activeTab === 'with-me' ? 'bg-indigo-50/50' : 'bg-emerald-50/50'} border-b border-gray-50 p-6 relative`}>
                                        <div className="absolute top-0 right-0 flex flex-col items-end">
                                            {/* Submitted Badge */}
                                            {form.isSubmitted && (
                                                <div className="bg-emerald-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500 mb-0.5">
                                                    <CheckCircle className="w-3 h-3 text-white" />
                                                    Submitted
                                                </div>
                                            )}

                                            {/* New Badge (< 2 Days) */}
                                            {!form.isSubmitted && (new Date().getTime() - new Date(form.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000) && (
                                                <div className="bg-blue-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500 mb-0.5">
                                                    <Sparkles className="w-3 h-3 text-white animate-sparkle" />
                                                    New
                                                </div>
                                            )}

                                            {/* Pending Badge (> 2 Days) */}
                                            {!form.isSubmitted && (new Date().getTime() - new Date(form.createdAt).getTime() >= 2 * 24 * 60 * 60 * 1000) && (
                                                <div className="bg-amber-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500 mb-0.5">
                                                    <Clock className="w-3 h-3 text-white" />
                                                    Pending
                                                </div>
                                            )}

                                            {/* Expiring Soon Badge */}
                                            {!form.isSubmitted && form.deadline && isExpiringSoon(form.deadline) && (
                                                <div className="bg-red-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500">
                                                    <AlertCircle className="w-3 h-3 text-white animate-blink" />
                                                    Expiring Soon
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-start gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0 cursor-pointer"
                                                onClick={(e) => { e.stopPropagation(); toggleSelection(form._id); }}
                                            >
                                                {selectedFormIds.has(form._id) ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <FileText className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate" title={form.title}>{form.title}</CardTitle>
                                                <CardDescription className="text-xs text-gray-500 line-clamp-1 mt-0.5" title={form.description}>{form.description}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 flex-1 flex flex-col">
                                        <div className="space-y-4 mb-6">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-medium">Shared By</span>
                                                <button
                                                    onClick={() => setViewingProfileUserId(form.createdBy?._id)}
                                                    className="text-indigo-600 font-bold hover:underline transition-all"
                                                >
                                                    {form.createdBy?.fullName || 'System'}
                                                    {form.createdBy?.labName && ` (${form.createdBy.labName})`}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-bold">Lab / Institution</span>
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{form.createdBy?.labName || 'CSIR'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-400 font-bold">Shared On</span>
                                                <span className="text-gray-600 font-bold">{formatDate(form.createdAt)}</span>
                                            </div>
                                            {form.deadline && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400 font-bold">Live Until</span>
                                                    <div className="flex items-center gap-2">
                                                        {isExpiringSoon(form.deadline) && new Date(form.deadline) > new Date() && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase">
                                                                Soon
                                                            </span>
                                                        )}
                                                        <span className={`font-bold ${isExpiringSoon(form.deadline)
                                                            ? 'text-red-600 animate-blink'
                                                            : (new Date(form.deadline) < new Date() ? 'text-red-500' : 'text-emerald-600')
                                                            }`}>
                                                            {formatDate(form.deadline)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {(!form.isSubmitted || activeTab === 'by-me') && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-400 font-bold uppercase tracking-tight">Pending Since</span>
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                                                        {getPendingDays(form.createdAt)} Days
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-auto space-y-4">
                                            {activeTab === 'by-me' && (
                                                <div className="space-y-3 pt-3 border-t border-gray-50">
                                                    <div className="flex flex-col gap-1.5 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Distribution Targets</span>
                                                            {(form.sharedWithLabs?.length > 5 || form.sharedWithUsers?.length > 5) && (
                                                                <button
                                                                    onClick={() => setViewingRecipientsForm(form)}
                                                                    className="text-indigo-600 hover:text-indigo-700 font-bold text-[9px] uppercase tracking-tighter hover:underline"
                                                                >
                                                                    View Full List
                                                                </button>
                                                            )}
                                                        </div>

                                                        {form.sharedWithLabs?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {form.sharedWithLabs.slice(0, 5).map((lab: string) => (
                                                                    <span key={lab} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-bold text-[10px]">
                                                                        {lab}
                                                                    </span>
                                                                ))}
                                                                {form.sharedWithLabs.length > 5 && (
                                                                    <button
                                                                        onClick={() => setViewingRecipientsForm(form)}
                                                                        className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md font-bold text-[10px] hover:bg-gray-100"
                                                                    >
                                                                        +{form.sharedWithLabs.length - 5}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {form.sharedWithUsers?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {form.sharedWithUsers.slice(0, 5).map((u: any) => (
                                                                    <span key={u._id} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md font-bold text-[10px]">
                                                                        {u.fullName || u.email}
                                                                    </span>
                                                                ))}
                                                                {form.sharedWithUsers.length > 5 && (
                                                                    <button
                                                                        onClick={() => setViewingRecipientsForm(form)}
                                                                        className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded-md font-bold text-[10px] hover:bg-gray-100"
                                                                    >
                                                                        +{form.sharedWithUsers.length - 5}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {form.isPublic && (
                                                            <span className="text-amber-600 font-bold italic text-[10px]">Public Access</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs pt-1">
                                                        <span className="text-gray-400 font-medium">Responses Collected</span>
                                                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full font-bold text-[10px]">{form.responseCount || 0}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            {activeTab === 'by-me' && (
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual LifeCycle</span>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleLiveStatus(form._id, form.isActive);
                                                            }}
                                                            className={`w-9 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${togglingId === form._id ? 'bg-indigo-300 cursor-not-allowed' : (form.isActive ? 'bg-indigo-600 shadow-sm' : 'bg-gray-200')}`}
                                                        >
                                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`}>
                                                                {togglingId === form._id && <Loader2 className="w-2 h-2 text-indigo-600 animate-spin" />}
                                                            </div>
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${form.isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                            {togglingId === form._id ? 'Updating...' : (form.isActive ? 'Live' : 'Stopped')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                {activeTab === 'with-me' ? (
                                                    <Button
                                                        label={
                                                            form.isSubmitted
                                                                ? ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? "View Response" : "Edit Response")
                                                                : ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? "Form Closed" : "Open & Fill Form")
                                                        }
                                                        className="w-full"
                                                        onClick={() => handleFillClick(form._id)}
                                                        icon={
                                                            form.isSubmitted
                                                                ? <Eye className="w-4 h-4" />
                                                                : ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? <X className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />)
                                                        }
                                                        disabled={!form.isSubmitted && (!form.isActive || (form.deadline && new Date(form.deadline) < new Date()))}
                                                        variant={
                                                            (!form.isActive || (form.deadline && new Date(form.deadline) < new Date()))
                                                                ? (form.isSubmitted ? "secondary" : "secondary")
                                                                : "primary"
                                                        }
                                                    />
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="secondary"
                                                            label="Responses"
                                                            className="flex-1"
                                                            icon={<Eye className="w-4 h-4" />}
                                                            onClick={() => setViewingSubmissionsTemplate(form)}
                                                        />
                                                        <button
                                                            onClick={() => handleDelete(form._id)}
                                                            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                        <th className="p-4 w-10">
                                            <div
                                                className="cursor-pointer text-gray-400 hover:text-indigo-600"
                                                onClick={toggleSelectAll}
                                            >
                                                {selectedFormIds.size === forms.length && forms.length > 0 ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                                            </div>
                                        </th>
                                        <th className="p-4">Form Details</th>
                                        <th className="p-4">Shared By / Creator</th>
                                        <th className="p-4 text-center">Responses</th>
                                        <th className="p-4">Status / Deadline</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {displayForms.map((form) => (
                                        <tr key={form._id} className={`hover:bg-slate-50 transition-colors group ${selectedFormIds.has(form._id) ? 'bg-indigo-50/30' : ''}`}>
                                            <td className="p-4">
                                                <div
                                                    className="cursor-pointer text-gray-300 hover:text-indigo-600 transition-colors"
                                                    onClick={() => toggleSelection(form._id)}
                                                >
                                                    {selectedFormIds.has(form._id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm truncate max-w-[200px]" title={form.title}>{form.title}</p>
                                                        <p className="text-xs text-gray-500 truncate max-w-[200px]" title={form.description}>{form.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-700">{form.createdBy?.fullName || 'System'}</span>
                                                    <span className="text-[10px] text-gray-500">{form.createdBy?.labName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">
                                                    {form.responseCount || 0}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    {form.isActive ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
                                                        </span>
                                                    )}
                                                    {form.deadline && (
                                                        <span className={`text-[10px] font-mono ${isExpiringSoon(form.deadline)
                                                            ? 'text-red-600 font-bold animate-blink'
                                                            : (new Date(form.deadline) > new Date() ? 'text-gray-500' : 'text-red-500')
                                                            }`}>
                                                            {formatDate(form.deadline)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {activeTab === 'with-me' ? (
                                                        <Button
                                                            size="sm"
                                                            label={
                                                                form.isSubmitted
                                                                    ? ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? "View" : "Edit")
                                                                    : ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? "Closed" : "Fill")
                                                            }
                                                            onClick={() => handleFillClick(form._id)}
                                                            icon={
                                                                form.isSubmitted
                                                                    ? <Eye className="w-3 h-3" />
                                                                    : ((!form.isActive || (form.deadline && new Date(form.deadline) < new Date())) ? <X className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />)
                                                            }
                                                            disabled={!form.isSubmitted && (!form.isActive || (form.deadline && new Date(form.deadline) < new Date()))}
                                                            variant={
                                                                (!form.isActive || (form.deadline && new Date(form.deadline) < new Date()))
                                                                    ? (form.isSubmitted ? "secondary" : "secondary")
                                                                    : "primary"
                                                            }
                                                        />
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                label="View"
                                                                icon={<Eye className="w-3 h-3" />}
                                                                onClick={() => setViewingSubmissionsTemplate(form)}
                                                            />
                                                            <div
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleLiveStatus(form._id, form.isActive);
                                                                }}
                                                                className={`w-8 h-4 rounded-full relative cursor-pointer transition-all duration-300 ${togglingId === form._id ? 'bg-indigo-300 cursor-not-allowed' : (form.isActive ? 'bg-indigo-600 shadow-sm' : 'bg-gray-200')}`}
                                                                title={form.isActive ? "Stop Form" : "Start Form"}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`}>
                                                                    {togglingId === form._id && <Loader2 className="w-2 h-2 text-indigo-600 animate-spin" />}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleDelete(form._id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="p-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 font-headline">No forms found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {activeTab === 'with-me'
                                ? "You haven't been invited to fill any forms yet."
                                : "You haven't distributed any forms for data collection yet."}
                        </p>
                    </div>
                )}


                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4 animate-in fade-in">
                        <div className="text-sm text-gray-500">
                            Showing <span className="font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-bold">{pagination.total}</span> forms
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                    // Simple logic to allow basic navigation
                                    // For complexity, we can be much smarter, but simple 1-5 or page-2...page+2 is enough
                                    let p = i + 1;
                                    if (pagination.totalPages > 5 && pagination.page > 3) {
                                        p = pagination.page - 2 + i;
                                    }
                                    if (p > pagination.totalPages) return null;

                                    return (
                                        <button
                                            key={p}
                                            onClick={() => handlePageChange(p)}
                                            className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${p === pagination.page
                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Filling Modal */}
            {isFillingModalOpen && selectedTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold font-headline">{selectedTemplate.title}</h2>
                                <p className="text-indigo-100 text-xs mt-1">{selectedTemplate.description}</p>
                            </div>
                            {selectedTemplate.deadline && (
                                <div className={`flex flex-col items-end ${isExpiringSoon(selectedTemplate.deadline) ? 'animate-pulse' : ''}`}>
                                    <span className="text-[10px] uppercase font-bold text-indigo-200 tracking-wider">Submission Deadline</span>
                                    <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded text-white backdrop-blur-sm">
                                        {formatDate(selectedTemplate.deadline)}
                                    </span>
                                </div>
                            )}
                            <button onClick={() => setIsFillingModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 global-scrollbar bg-white">
                            <DynamicFormRenderer
                                fields={selectedTemplate.fields}
                                formData={formData}
                                onChange={handleInputChange}
                                readOnly={isReadOnly}
                            />
                        </div>
                        <div className="p-6 border-t border-gray-50 bg-white shrink-0">
                            <div className="flex gap-4">
                                <Button variant="secondary" label={isReadOnly ? "Close" : "Cancel"} onClick={() => setIsFillingModalOpen(false)} className="flex-1" />
                                {!isReadOnly && (
                                    <Button variant="primary" label={forms.find(f => f._id === selectedTemplate._id)?.isSubmitted ? "Update Response" : "Submit Response"} onClick={handleSubmit} loading={isSubmitting} className="flex-1" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Modal */}
            {viewingSubmissionsTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 h-[90vh] flex flex-col">
                        <FormSubmissionsView
                            templateId={viewingSubmissionsTemplate._id}
                            formSchema={viewingSubmissionsTemplate}
                            onClose={() => setViewingSubmissionsTemplate(null)}
                        />
                    </div>
                </div>
            )}

            {/* Distribution Targets Modal */}
            {viewingRecipientsForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[80vh] flex flex-col">
                        <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Distribution Targets</h2>
                                <p className="text-gray-500 text-xs mt-1">{viewingRecipientsForm.title}</p>
                            </div>
                            <button onClick={() => setViewingRecipientsForm(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto flex-1 global-scrollbar space-y-8">
                            {viewingRecipientsForm.sharedWithLabs?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Laboratories ({viewingRecipientsForm.sharedWithLabs.length})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {viewingRecipientsForm.sharedWithLabs.map((lab: string) => (
                                            <div key={lab} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[11px] font-bold border border-indigo-100 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                {lab}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewingRecipientsForm.sharedWithUsers?.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Specific Users ({viewingRecipientsForm.sharedWithUsers.length})</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {viewingRecipientsForm.sharedWithUsers.map((u: any) => (
                                            <div key={u._id} className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                    {(u.fullName || u.email || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-[11px] font-bold text-gray-900">{u.fullName || u.email}</div>
                                                    <div className="text-[9px] text-emerald-600 font-medium uppercase tracking-tighter">{u.designation || 'Staff'} • {u.labName || 'CSIR'}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {viewingRecipientsForm.isPublic && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-amber-900">Public Access Enabled</div>
                                        <div className="text-[10px] text-amber-600">This form is open to all authenticated users in the system.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-50 flex justify-end">
                            <Button label="Close" onClick={() => setViewingRecipientsForm(null)} />
                        </div>
                    </div>
                </div>
            )}

            {/* Profile View Modal */}
            <UserProfileViewModal
                isOpen={!!viewingProfileUserId}
                onClose={() => setViewingProfileUserId(null)}
                userId={viewingProfileUserId}
            />
        </div>
    );
}
