/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FormCard } from '../../components/ui/FormCard';
import Button from '../../components/ui/Button';
import {
    Search, X, Bell, ArrowRight, Eye
} from 'lucide-react';
import {
    getSharedByMe,
    deleteActiveForm,
    updateActiveForm
} from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';
import { useAuth } from '../../context/AuthContext';
import FormSubmissionsView from '../../components/ui/FormSubmissionsView';
import UserProfileViewModal from '../../components/ui/UserProfileViewModal';
import { DistributionTargetsModal } from '../../components/ui/DistributionTargetsModal';
import DynamicFormRenderer from '../../components/ui/DynamicFormRenderer';

export default function SharedByMePage() {
    const { user } = useAuth();
    const { showMessage, showConfirm } = useMessageBox();

    // State
    const [forms, setForms] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, totalPages: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
    const [layoutMode] = useState<'grid' | 'list'>('grid');
    const [selectedFormIds] = useState<Set<string>>(new Set());

    // Modal States
    const [viewingSubmissionsTemplate, setViewingSubmissionsTemplate] = useState<any | null>(null);
    const [viewingRecipientsForm, setViewingRecipientsForm] = useState<any | null>(null);
    const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
    const [viewingTemplate, setViewingTemplate] = useState<any | null>(null);
    const [togglingLiveId, setTogglingLiveId] = useState<string | null>(null);

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchForms(1);
    }, [viewMode]);

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
                search: searchQuery
            };
            const response = await getSharedByMe(params);
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

    const handleDelete = async (id: string) => {
        const confirm = await showConfirm({
            title: 'Delete Form',
            message: 'Are you sure you want to delete this form? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'error'
        });

        if (confirm) {
            try {
                const response = await deleteActiveForm(id);
                if (response.success) {
                    showMessage({ title: 'Deleted', message: 'Form deleted successfully', type: 'success' });
                    fetchForms();
                }
            } catch (error: any) {
                showMessage({ message: error.message || 'Failed to delete form', type: 'error' });
            }
        }
    };

    const handleToggleLiveStatus = async (id: string, currentStatus: boolean) => {
        setTogglingLiveId(id);
        try {
            const response = await updateActiveForm(id, { isActive: !currentStatus });
            if (response.success) {
                showMessage({ title: 'Updated', message: `Form is now ${!currentStatus ? 'Live' : 'Stopped'}`, type: 'success' });
                setForms(prev => prev.map(f => f._id === id ? { ...f, isActive: !currentStatus } : f));
            } else {
                showMessage({ message: response.message, type: 'error' });
            }
        } catch (error: any) {
            showMessage({ message: 'Failed to update status', type: 'error' });
        } finally {
            setTogglingLiveId(null);
        }
    };



    const renderActions = (form: any) => {
        // Only valid if createdBy matches current user OR user is Superadmin
        const canDelete = (user && form.createdBy && form.createdBy._id === user._id) || user?.role === 'Superadmin';

        return (
            <div className="flex gap-2 items-center w-full">
                {/* Open Distribution List for Reminders */}
                <button
                    onClick={(e) => { e.stopPropagation(); setViewingRecipientsForm(form); }}
                    title="View Recipients & Send Reminders"
                    className="p-2.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100"
                >
                    <Bell className="w-4 h-4" />
                </button>

                <Button
                    variant="secondary"
                    label="Responses"
                    className="flex-1 h-10"
                    onClick={(e) => { e?.stopPropagation(); setViewingSubmissionsTemplate(form); }}
                />

                {canDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(form._id); }}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-gray-100"
                        title="Delete Form"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter">Distributed By Me</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold tracking-widest opacity-60">Forms you have created and shared</p>
                </div>

                {/* Filters */}
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
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                            <button onClick={() => setViewMode('active')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'active' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Active</button>
                            <button onClick={() => setViewMode('archived')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'archived' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Archived</button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-2xl" />)}
                    </div>
                ) : forms.length > 0 ? (
                    layoutMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {forms.map(form => (
                                <FormCard
                                    key={form._id}
                                    form={form}
                                    variant="distributed"
                                    layoutMode="grid"
                                    selected={selectedFormIds.has(form._id)}
                                    onViewProfile={setViewingProfileId}
                                    onViewRecipients={setViewingRecipientsForm}
                                    onViewResponses={setViewingSubmissionsTemplate}
                                    onView={setViewingTemplate}
                                    onToggleLiveStatus={handleToggleLiveStatus}
                                    togglingId={togglingLiveId}
                                    actions={renderActions(form)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <tbody className="divide-y divide-gray-50">
                                    {forms.map(form => (
                                        <FormCard
                                            key={form._id}
                                            form={form}
                                            variant="distributed"
                                            layoutMode="list"
                                            selected={selectedFormIds.has(form._id)}
                                            onViewProfile={setViewingProfileId}
                                            onViewRecipients={setViewingRecipientsForm}
                                            onViewResponses={setViewingSubmissionsTemplate}
                                            onView={setViewingTemplate}
                                            onToggleLiveStatus={handleToggleLiveStatus}
                                            togglingId={togglingLiveId}
                                            actions={renderActions(form)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : (
                    <div className="p-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 font-headline">No forms found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-6">You haven't distributed any forms yet.</p>
                        <Link
                            to="/data-collection/saved"
                            className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline transition-colors text-sm flex items-center gap-1"
                        >
                            Go to your Saved Templates
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}
            </div>

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
                <DistributionTargetsModal
                    form={viewingRecipientsForm}
                    onClose={() => setViewingRecipientsForm(null)}
                />
            )}

            {viewingProfileId && (
                <UserProfileViewModal
                    isOpen={!!viewingProfileId}
                    onClose={() => setViewingProfileId(null)}
                    userId={viewingProfileId}
                />
            )}

            {/* Template Preview Modal */}
            {viewingTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-120 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-indigo-600 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="bg-indigo-600 p-8 flex items-center justify-between text-white shrink-0">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <Eye className="w-8 h-8" />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-bold font-headline tracking-tight">{viewingTemplate.title}</h2>
                                    <p className="text-indigo-100/80 text-xs font-medium uppercase tracking-widest mt-1">Read-only template view</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingTemplate(null)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 overflow-y-auto flex-1 bg-gray-50 custom-scrollbar">
                            <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <div className="mb-8 pb-6 border-b border-gray-50">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Form Description</h3>
                                    <p className="text-gray-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100 italic text-sm">
                                        {viewingTemplate.description || "No description provided for this template."}
                                    </p>
                                </div>
                                <DynamicFormRenderer
                                    fields={viewingTemplate.fields || []}
                                    formData={{}}
                                    readOnly={true}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-white flex justify-end shrink-0">
                            <Button
                                label="Close Preview"
                                variant="secondary"
                                onClick={() => setViewingTemplate(null)}
                                className="px-8"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
