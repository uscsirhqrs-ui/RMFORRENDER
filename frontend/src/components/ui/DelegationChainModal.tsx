/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { X, GitCommit } from 'lucide-react';
import { getChainDetails } from '../../services/form.api';
import { MovementHistory } from './MovementHistory';

interface DelegationChainModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentUser: any;
    onViewProfile: (userId: string) => void;
}

export default function DelegationChainModal({ isOpen, onClose, form }: DelegationChainModalProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [timeline, setTimeline] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // Error state removed — log errors to console instead of keeping unused state

    useEffect(() => {
        if (isOpen && form) {
            const assignmentId = form.assignment?._id || form.myDelegation?._id;
            if (assignmentId) {
                setLoading(true);
                getChainDetails(assignmentId)
                    .then(response => {
                        if (response.success && 'data' in response && response.data) {
                            setTimeline(response.data);
                        } else {
                            console.error('Failed to load chain details');
                        }
                    })
                    .catch((e) => console.error('Failed to load chain details', e))
                    .finally(() => setLoading(false));
            } else {
                // No assignment (e.g. Creator looking at undelivered form?)
                setTimeline([]);
            }
        }
    }, [isOpen, form]);

    if (!isOpen || !form) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300 max-h-[80vh] flex flex-col">
                <CardHeader className="bg-white border-b border-gray-100 p-6 flex flex-row items-center justify-between sticky top-0 z-20">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <GitCommit className="w-5 h-5 text-indigo-600" />
                            Movement History
                        </CardTitle>
                        <p className="text-gray-500 text-xs mt-1 font-medium opacity-80 uppercase tracking-widest">Complete path of form movement</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </CardHeader>
                <CardContent className="p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                    <MovementHistory
                        history={timeline}
                        isLoading={loading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
