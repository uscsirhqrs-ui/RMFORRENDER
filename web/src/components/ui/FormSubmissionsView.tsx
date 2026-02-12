/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState, useEffect } from 'react';
import { getFormSubmissions, getChainByDataId } from '../../services/form.api';
import DynamicFormRenderer, { type FormField } from './DynamicFormRenderer';
import { Loader2, ChevronLeft, ChevronRight, User, Download, X } from 'lucide-react';
import UserProfileViewModal from './UserProfileViewModal';
import Papa from 'papaparse';
import { MovementHistory } from './MovementHistory';
import { generateSubmissionPDF } from '../../utils/pdfGenerator';

interface FormSubmissionsViewProps {
    templateId: string;
    formSchema: {
        title: string;
        fields: FormField[];
    };
    onClose: () => void;
}

const FormSubmissionsView: React.FC<FormSubmissionsViewProps> = ({ templateId, formSchema, onClose }) => {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

    // Chain History State
    const [chainHistory, setChainHistory] = useState<any[]>([]);
    const [chainLoading, setChainLoading] = useState(false);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setLoading(true);
            const response = await getFormSubmissions(templateId);
            if (response.success && Array.isArray(response.data)) {
                setSubmissions(response.data);
                setError(null);
            } else {
                setError(response.message || "Failed to load submissions");
            }
            setLoading(false);
        };

        if (templateId) {
            fetchSubmissions();
        }
    }, [templateId]);

    // Fetch chain when current submission changes
    useEffect(() => {
        if (submissions.length > 0 && submissions[currentIndex]) {
            const currentSub = submissions[currentIndex];
            if (currentSub._id) {
                setChainLoading(true);
                getChainByDataId(currentSub._id)
                    .then((res: any) => {
                        if (res.success && res.data) {
                            setChainHistory(res.data);
                        } else {
                            // Fallback to empty if failed, though explicit failure handling might be better
                            setChainHistory([]);
                        }
                    })
                    .catch(() => setChainHistory([]))
                    .finally(() => setChainLoading(false));
            }
        }
    }, [submissions, currentIndex]);

    const handleNext = () => {
        if (currentIndex < submissions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleExport = () => {
        if (!submissions || submissions.length === 0) return;

        // Flatten data for CSV
        const flattenData = submissions.map(sub => {
            const flat: Record<string, any> = {
                "Submitted By": sub.submittedBy?.fullName || "Unknown",
                "Submitter Email": sub.submittedBy?.email || "",
                "Submitter Phone": sub.submittedBy?.mobileNo || "",
                "Submitter Designation": sub.submittedBy?.designation || "",
                "Submitter Lab/Institution": sub.labName || "",
                "Submission Date": new Date(sub.createdAt).toLocaleString(),
                "Submitter IP Address": sub.ipAddress || "Not Captured",
            };

            // Add Form Fields
            formSchema.fields.forEach(field => {
                const val = sub.data?.[field.id];
                // Handle complex types like checkbox arrays
                if (Array.isArray(val)) {
                    flat[field.label] = val.join(', ');
                } else if (typeof val === 'object' && val !== null) {
                    flat[field.label] = JSON.stringify(val);
                } else {
                    flat[field.label] = val || "";
                }
            });

            return flat;
        });

        const csv = Papa.unparse(flattenData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${formSchema.title.replace(/\s+/g, '_')}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-gray-500">Loading submissions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 font-medium mb-4">{error}</p>
                <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
        );
    }

    if (submissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📭</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                    There are no data submissions recorded for this form template yet.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                >
                    Back to Forms
                </button>
            </div>
        );
    }

    const currentSubmission = submissions[currentIndex];

    // Determine if we should show navigation controls (Next/Previous)
    const showControls = submissions.length > 1;

    const handleDownloadPDF = async () => {
        const currentSubmission = submissions[currentIndex];
        if (!currentSubmission) return;

        // Use chainHistory state which is already fetched for the current submission
        await generateSubmissionPDF(
            currentSubmission,
            formSchema,
            chainHistory
        );
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-gray-700 hover:shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{formSchema.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-medium text-indigo-600">Response #{currentIndex + 1}</span>
                            <span>of {submissions.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold tracking-wider mr-2 border border-indigo-200 transition-colors"
                        title="Download PDF"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold tracking-wider mr-2 border border-emerald-200 transition-colors"
                        title="Download CSV"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    {showControls && (
                        <div className="flex items-center gap-2 pr-2 border-r border-gray-200 mr-2">
                            <button
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-sm bg-gray-50"
                                title="Previous Submission"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === submissions.length - 1}
                                className="p-2 border rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-sm bg-gray-50"
                                title="Next Submission"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                        title="Close Viewer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Content Scroller */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                <div className="max-w-3xl mx-auto space-y-6">

                    {/* Submission Metadata Card */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3
                                    className="font-semibold text-indigo-600 hover:underline cursor-pointer transition-all"
                                    onClick={() => currentSubmission.submittedBy?._id && setViewingProfileUserId(currentSubmission.submittedBy._id)}
                                >
                                    {currentSubmission.submittedBy?.fullName || "Unknown User"}
                                </h3>
                                {currentSubmission.submittedBy?.designation && (
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 border border-gray-200">
                                        {currentSubmission.submittedBy.designation}
                                    </span>
                                )}
                            </div>
                            <div className="text-sm text-gray-500 space-y-0.5">
                                <p>{currentSubmission.submittedBy?.email}</p>
                                <p className="text-xs text-gray-400">
                                    Submitted on {new Date(currentSubmission.createdAt).toLocaleString()} • {currentSubmission.labName}
                                    {currentSubmission.ipAddress && (
                                        <>
                                            <span className="mx-1">•</span>
                                            <span className="font-medium text-gray-600">IP: {currentSubmission.ipAddress}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form Data */}
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                        <DynamicFormRenderer
                            fields={formSchema.fields}
                            formData={currentSubmission.data || {}}
                            readOnly={true}
                        />
                    </div>

                    {/* Movement History / Workflow Trail - Updated to use reusable Component */}
                    {(chainLoading || (chainHistory && chainHistory.length > 0)) && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <MovementHistory
                                history={chainHistory}
                                isLoading={chainLoading}
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                    Close Viewer
                </button>
            </div>

            {/* Profile View Modal */}
            <UserProfileViewModal
                isOpen={!!viewingProfileUserId}
                onClose={() => setViewingProfileUserId(null)}
                userId={viewingProfileUserId}
            />
        </div>
    );
};

export default FormSubmissionsView;
