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
import { User, Clock, Loader2 } from 'lucide-react';
import UserProfileViewModal from './UserProfileViewModal';
import { MovementType } from '../../constants';

interface MovementHistoryProps {
    history: any[];
    isLoading: boolean;
}

export const MovementHistory: React.FC<MovementHistoryProps> = ({
    history,
    isLoading
}) => {
    const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const handleUserClick = (userId: string) => {
        if (!userId) return;
        setSelectedUserId(userId);
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-6">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
        );
    }

    if (!history || history.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No history recorded for this form</p>
            </div>
        );
    }

    const initiator = history[0];

    return (
        <>
            <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">Movement History</h3>
                </div>
                <div className="flex flex-col gap-4">
                    {/* Initiator */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-4 bg-white border border-indigo-100 p-4 rounded-2xl shadow-sm w-full transition-all group">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initiator</span>
                                </div>
                                <button
                                    onClick={() => handleUserClick(initiator?.fromUser?._id)}
                                    className="text-sm font-bold text-indigo-900 block truncate hover:text-indigo-600 hover:underline text-left"
                                >
                                    {initiator?.fromUser?.fullName || 'Unknown'}
                                </button>
                                <span className="text-[10px] text-indigo-500 block truncate">
                                    {initiator?.fromUser?.designation} • {initiator?.fromUser?.labName}
                                </span>
                                {/* Filling Instructions */}
                                {initiator?.remarks && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-0.5">Remarks</p>
                                        <p className="text-xs text-gray-600 italic">"{initiator.remarks}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Steps (Skip index 0 as it is the Initiator/Root rendered above) */}
                    {history.map((step: any, index: number) => {


                        const actionLabel = step.type === MovementType.INITIATED
                            ? MovementType.INITIATED
                            : (step.action || (step.type === MovementType.RETURNED ? MovementType.RETURNED : MovementType.DELEGATED));

                        const isLastStep = index === history.length - 1;
                        const nextStep = history[index + 1];
                        const remarksToShow = nextStep?.remarks;

                        return (
                            <div key={step._id || index} className="flex flex-col items-center w-full">
                                <div className="h-2 w-0.5 bg-indigo-100 my-0.5"></div>

                                {/* Action Label */}
                                <div className={`bg-white border px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 shadow-sm ${actionLabel === 'Auto-Approved' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : (step.type === MovementType.INITIATED ? 'border-purple-200 text-purple-700 bg-purple-50' : 'border-indigo-100 text-indigo-600')}`}>
                                    {actionLabel}
                                </div>

                                <div className="h-6 w-0.5 bg-indigo-100 my-1"></div>

                                {isLastStep ? (
                                    <div className="flex items-center gap-4 bg-indigo-600 border border-indigo-500 p-4 rounded-xl shadow-md w-full ring-4 ring-indigo-50">
                                        <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0 text-white">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Current Holder</span>
                                            </div>
                                            <button
                                                onClick={() => handleUserClick(step.toUser?._id)}
                                                className="text-sm font-bold block truncate mt-0.5 hover:text-indigo-100 hover:underline text-left"
                                            >
                                                {step.toUser?.fullName || 'You'}
                                            </button>
                                            <span className="text-[10px] text-indigo-200 block truncate">
                                                {step.toUser?.designation} • {step.toUser?.labName}
                                            </span>

                                            {/* Filling Instructions */}
                                            {remarksToShow && (
                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                    <p className="text-[10px] uppercase font-bold text-indigo-400 tracking-widest mb-0.5">Remarks</p>
                                                    <p className="text-xs text-white/90 italic">"{remarksToShow}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 bg-white border border-indigo-100 p-4 rounded-xl shadow-sm w-full opacity-80 hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {step.type === MovementType.RETURNED ? 'Returned To' : 'Delegated To'}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleUserClick(step.toUser?._id)}
                                                className="text-sm font-bold text-gray-700 block truncate mt-0.5 hover:text-indigo-600 hover:underline text-left"
                                            >
                                                {step.toUser?.fullName}
                                            </button>
                                            <span className="text-[10px] text-indigo-500 block truncate">
                                                {step.toUser?.designation} • {step.toUser?.labName}
                                            </span>

                                            {/* Filling Instructions */}
                                            {remarksToShow && (
                                                <div className="mt-2 pt-2 border-t border-gray-100">
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-0.5">Remarks</p>
                                                    <p className="text-xs text-gray-600 italic">"{remarksToShow}"</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <UserProfileViewModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={selectedUserId}
            />
        </>
    );
};
