/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { changePassword } from '../../services/user.api';
import InputField from './InputField';
import Button from './Button';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
            return;
        }

        setIsLoading(true);
        try {
            const response = await changePassword({ oldPassword, newPassword });
            if (response.success) {
                setMessage({ type: 'success', text: 'Password changed successfully' });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setTimeout(() => {
                    onClose();
                    setMessage(null);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {message && (
                        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField
                            id="oldPassword"
                            label="Current Password"
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4 text-gray-400" />}
                            placeholder="Enter current password"
                            required
                        />

                        <InputField
                            id="newPassword"
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4 text-gray-400" />}
                            placeholder="Enter new password"
                            required
                        />

                        <InputField
                            id="confirmPassword"
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            icon={<Lock className="w-4 h-4 text-gray-400" />}
                            placeholder="Confirm new password"
                            required
                        />

                        <div className="pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end">
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={isLoading}
                                loading={isLoading}
                                icon={isLoading && <Loader2 className="w-4 h-4" />}
                                className="w-full sm:w-auto"
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
