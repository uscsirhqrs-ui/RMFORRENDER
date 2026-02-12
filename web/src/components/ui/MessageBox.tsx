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
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

export type MessageBoxType = 'success' | 'error' | 'warning' | 'info';

interface MessageBoxProps {
    isOpen: boolean;
    title?: string;
    message: React.ReactNode;
    type?: MessageBoxType;
    showCancelButton?: boolean;
    confirmText?: string;
    cancelText?: string;
    onOk: (inputValue?: string) => void;
    onClose: () => void;
    showInput?: boolean;
    inputPlaceholder?: string;
    inputLabel?: string;
    initialValue?: string;
}

const MessageBox: React.FC<MessageBoxProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    showCancelButton = false,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onOk,
    onClose,
    showInput = false,
    inputPlaceholder = '',
    inputLabel = 'Remarks',
    initialValue = ''
}) => {
    const [inputValue, setInputValue] = React.useState('');

    React.useEffect(() => {
        if (isOpen) setInputValue(initialValue || '');
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-10 h-10 text-green-500" />;
            case 'error':
                return <XCircle className="w-10 h-10 text-red-500" />;
            case 'warning':
                return <AlertCircle className="w-10 h-10 text-amber-500" />;
            default:
                return <Info className="w-10 h-10 text-blue-500" />;
        }
    };

    const getTitle = () => {
        if (title) return title;
        switch (type) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            case 'warning': return 'Warning';
            default: return 'Information';
        }
    };

    const handleOk = () => {
        if (onOk) onOk(inputValue);
        onClose();
    };

    const getConfirmButtonClasses = () => {
        switch (type) {
            case 'success':
                return 'bg-green-600 hover:bg-green-700 shadow-green-200';
            case 'error':
                return 'bg-red-600 hover:bg-red-700 shadow-red-200';
            case 'warning':
                return 'bg-amber-500 hover:bg-amber-600 shadow-amber-200';
            default:
                return 'bg-blue-600 hover:bg-blue-700 shadow-blue-200';
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-99999 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 p-3 bg-gray-50 rounded-full">
                            {getIcon()}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {getTitle()}
                        </h3>

                        <div className="text-gray-600 text-sm leading-relaxed mb-6">
                            {message}
                        </div>

                        {showInput && (
                            <div className="w-full mb-6 text-left">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 mb-1 block">{inputLabel}</label>
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={inputPlaceholder}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm min-h-[80px] resize-none"
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-3 w-full">
                            {showCancelButton && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl text-gray-700 font-medium border border-gray-200 hover:bg-gray-50 transition-all flex-1"
                                >
                                    {cancelText}
                                </button>
                            )}
                            <button
                                onClick={handleOk}
                                className={`py-2.5 px-4 rounded-xl text-white font-semibold shadow-md transition-all transform active:scale-[0.98] ${getConfirmButtonClasses()} ${showCancelButton ? 'flex-1' : 'w-full'}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBox;
