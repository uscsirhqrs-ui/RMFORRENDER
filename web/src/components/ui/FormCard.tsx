/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import {
    FileText, CheckSquare, Square,
    Clock, Edit, CheckCircle, Send, AlertCircle
} from 'lucide-react';

export interface FormCardProps {
    form: any;
    variant: 'received' | 'distributed';
    selected?: boolean;
    onToggleSelection?: (id: string) => void;
    onViewProfile?: (userId: string) => void;
    onViewRecipients?: (form: any) => void;
    onViewResponses?: (form: any) => void;
    onToggleLiveStatus?: (id: string, status: boolean) => void;
    onView?: (form: any) => void;
    togglingId?: string | null;
    actions: React.ReactNode;
    layoutMode?: 'grid' | 'list';
}

// Helper functions for UI display
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

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

export const FormCard: React.FC<FormCardProps> = ({
    form,
    variant,
    selected = false,
    onToggleSelection,
    onViewProfile,
    onViewRecipients,
    onViewResponses,
    onToggleLiveStatus,
    onView,
    togglingId,
    actions,
    layoutMode = 'grid'
}) => {
    // Shared Status Badge Logic (Pure UI)
    const renderStatusBadge = () => {
        const status = form.workflowStatus || (form.isSubmitted ? 'Submitted' : 'Pending');
        const config = {
            'Pending': { bg: 'bg-gray-500', icon: <Clock className="w-3 h-3 text-white" /> },
            'Edited': { bg: 'bg-blue-500', icon: <Edit className="w-3 h-3 text-white" /> },
            'Approved': { bg: 'bg-amber-500', icon: <CheckCircle className="w-3 h-3 text-white" /> },
            'Submitted': { bg: 'bg-emerald-500', icon: <Send className="w-3 h-3 text-white" /> }
        } as any;
        const current = config[status] || config['Pending'];

        return (
            <div className={`${current.bg} text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500`}>
                {current.icon}
                {status}
            </div>
        );
    };

    if (layoutMode === 'list') {
        return (
            <tr
                className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selected ? 'bg-indigo-50/30' : ''}`}
                onClick={() => onView?.(form)}
            >
                <td className="p-4">
                    <div
                        className="cursor-pointer text-gray-300 hover:text-indigo-600 transition-colors"
                        onClick={() => onToggleSelection?.(form._id)}
                    >
                        {selected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
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
                        {variant === 'received' && (
                            <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${form.allowDelegation !== false ? 'text-indigo-600' : 'text-red-500'}`}>
                                {form.allowDelegation !== false ? 'Delegation Enabled' : 'Delegation Restricted'}
                            </span>
                        )}
                    </div>
                </td>
                <td className="p-4 text-center">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold">
                        {form.responseCount || 0}
                    </span>
                </td>
                <td className="p-4">
                    <div className="flex flex-col gap-1.5">
                        {(() => {
                            const status = form.workflowStatus || (form.isSubmitted ? 'Submitted' : 'Pending');
                            const config = {
                                'Pending': { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
                                'Edited': { bg: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
                                'Approved': { bg: 'bg-amber-50 text-amber-600', dot: 'bg-amber-500' },
                                'Submitted': { bg: 'bg-emerald-50 text-emerald-600', dot: 'bg-emerald-500' }
                            } as any;
                            const current = config[status] || config['Pending'];
                            return (
                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${current.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
                                    {status}
                                </span>
                            );
                        })()}
                        {form.deadline && (
                            <span className={`text-[10px] font-mono pl-0.5 ${isExpiringSoon(form.deadline)
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
                        {actions}
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <Card
            className={`group hover:shadow-xl transition-all duration-300 border-transparent hover:border-indigo-100 h-full flex flex-col cursor-pointer ${selected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}
            onClick={() => onView?.(form)}
        >
            <CardHeader className={`${variant === 'received' ? 'bg-indigo-50/50' : 'bg-emerald-50/50'} border-b border-gray-50 p-6 relative`}>
                <div className="absolute top-0 right-0 flex flex-col items-end">
                    {renderStatusBadge()}

                    {/* Expiring Soon Badge */}
                    {!form.isSubmitted && form.deadline && isExpiringSoon(form.deadline) && new Date(form.deadline) > new Date() && (
                        <div className="bg-red-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1.5 animate-in slide-in-from-right-2 fade-in duration-500 mt-1">
                            <AlertCircle className="w-3 h-3 text-white animate-blink" />
                            Expiring
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-start gap-4">
                    <div
                        className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0 cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); onToggleSelection?.(form._id); }}
                    >
                        {selected ? <CheckSquare className="w-6 h-6 text-indigo-600" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0 pr-28">
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
                            onClick={(e) => { e.stopPropagation(); onViewProfile?.(form.createdBy?._id); }}
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
                    {(variant === 'received' || variant === 'distributed') && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-tight">Delegation</span>
                            <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${form.allowDelegation !== false ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                                    {form.allowDelegation !== false ? 'Enabled' : 'Restricted'}
                                </span>
                                <div className="group relative">
                                    <AlertCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-900/95 backdrop-blur shadow-2xl text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none border border-gray-700/50 z-100 translate-y-1 group-hover:translate-y-0">
                                        <div className="font-bold border-b border-gray-700 pb-1 mb-1 text-indigo-400 uppercase tracking-widest text-[8px]">Workflow Rule</div>
                                        {form.allowDelegation !== false
                                            ? (variant === 'received'
                                                ? "Distributor has allowed delegation. You can re-assign this task to subordinates."
                                                : "You have allowed delegation. Recipients can re-assign this task to their subordinates.")
                                            : (variant === 'received'
                                                ? "Distributor has restricted delegation. You must fill this form yourself."
                                                : "You have restricted delegation. Recipients must fill this form themselves.")
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {(!form.isSubmitted || variant === 'distributed') && (
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-bold uppercase tracking-tight">Pending Since</span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                                {getPendingDays(form.createdAt)} Days
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-auto space-y-4">
                    {variant === 'distributed' && (
                        <div className="space-y-3 pt-3 border-t border-gray-50">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-medium">Distributed To</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewRecipients?.(form); }}
                                    className="px-2 py-0.5 bg-blue-600 text-white rounded-full font-bold text-[10px] hover:bg-blue-700 transition-colors cursor-pointer"
                                >
                                    {(form.sharedWithUsers?.length || 0) + (form.sharedWithLabs?.length || 0)}
                                </button>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400 font-medium">Responses Collected</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewResponses?.(form); }}
                                    className="px-2 py-0.5 bg-green-600 text-white rounded-full font-bold text-[10px] hover:bg-green-700 transition-colors cursor-pointer"
                                >
                                    {form.responseCount || 0}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Manual Lifecycle Control for Distributed Forms */}
                    {variant === 'distributed' && (
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual LifeCycle</span>
                            <div className="flex items-center gap-2">
                                {/* Toggle Switch UI */}
                                <div
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleLiveStatus?.(form._id, form.isActive);
                                    }}
                                    className={`w-9 h-5 rounded-full relative cursor-pointer transition-all duration-300 ${togglingId === form._id ? 'bg-indigo-300 cursor-not-allowed' : (form.isActive ? 'bg-indigo-600 shadow-sm' : 'bg-gray-200')}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`}>
                                        {/* Spinner if Loading */}
                                        {togglingId === form._id && <div className="w-2 h-2 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${form.isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {togglingId === form._id ? 'Updating...' : (form.isActive ? 'Live' : 'Stopped')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons Area */}
                    <div className="flex flex-col gap-1 w-full mt-3">
                        {actions}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
