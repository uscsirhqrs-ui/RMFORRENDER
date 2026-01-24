/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState } from 'react';
import Button from './Button';
import { requestReopen } from '../../services/globalReferences.api';
import { requestLocalReopen } from '../../services/localReferences.api';
import type { Reference } from '../../types/Reference.type';
import { X } from 'lucide-react';

interface ReopenRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    reference: Reference;
    onSuccess: () => void;
    referenceType?: 'GlobalReference' | 'LocalReference';
}

const ReopenRequestModal = ({ isOpen, onClose, reference, onSuccess, referenceType }: ReopenRequestModalProps) => {
    const [remarks, setRemarks] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!remarks.trim()) {
            setMessage({ type: 'error', text: "Remarks are required." });
            return;
        }

        setLoading(true);
        try {
            if (referenceType === 'LocalReference') {
                await requestLocalReopen(reference._id, remarks);
            } else {
                await requestReopen(reference._id, remarks);
            }
            setMessage({ type: 'success', text: "Reopening request sent successfully." });
            setRemarks('');
            onSuccess();
            // Auto close after 2 seconds
            setTimeout(() => {
                onClose();
                setMessage(null);
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || "Failed to send request" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Request Reopening
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className='grid grid-cols-2 gap-2'>
                            <div>
                                <span className='font-semibold text-gray-700'>Ref ID:</span> {reference.refId}
                            </div>
                            <div>
                                <span className='font-semibold text-gray-700'>Status:</span>
                                <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    {reference.status}
                                </span>
                            </div>
                            <div className='col-span-2'>
                                <span className='font-semibold text-gray-700'>Subject:</span> {reference.subject}
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} id="reopen-form" className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">
                                Reason for Reopening <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="remarks"
                                rows={4}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all resize-none ${message?.type === 'error' ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
                                placeholder="Please describe why this reference needs to be reopened..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                required
                                disabled={message?.type === 'success'}
                            />
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                                label="Cancel"
                                className="w-full sm:w-auto flex justify-center !text-center"
                            />
                            <Button
                                type="submit"
                                variant="primary"
                                label={loading ? "Sending..." : "Send Request"}
                                disabled={loading || (message?.type === 'success')}
                                className="w-full sm:w-auto flex justify-center text-center!"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ReopenRequestModal;
