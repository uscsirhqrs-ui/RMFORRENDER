/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { activateAccount } from '../services/user.api';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

const ActivationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    const token = searchParams.get('token');
    const userId = searchParams.get('userId');

    useEffect(() => {
        const performActivation = async () => {
            if (!token || !userId) {
                setStatus('error');
                setMessage('Invalid activation link. Missing token or user ID.');
                return;
            }

            try {
                const response = await activateAccount({ userId, token });
                if (response.success) {
                    setStatus('success');
                    setMessage(response.message || 'Account activated successfully!');
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Failed to activate account.');
                }
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message || 'An error occurred during activation.');
            }
        };

        performActivation();
    }, [token, userId]);

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-indigo-100/50 p-8 border border-gray-100 text-center animate-scale-in">
                {status === 'loading' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center animate-pulse">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 font-heading">Activating Account</h2>
                        <p className="text-gray-500">Please wait while we verify your activation link...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center animate-bounce-subtle">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 font-heading">Activation Successful!</h2>
                        <p className="text-gray-500">{message}</p>
                        <div className="pt-4">
                            <Button
                                onClick={() => navigate('/login')}
                                icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                iconPosition="right"
                                fullWidth
                                className="group"
                            >
                                Continue to Login
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center animate-shake">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 font-heading">Activation Failed</h2>
                        <p className="text-red-500 font-medium">{message}</p>
                        <p className="text-sm text-gray-500">
                            The link may be expired or already used. If you continue to have issues, please contact the administrator.
                        </p>
                        <div className="pt-4 flex flex-col gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => navigate('/login')}
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                            <Link to="/" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
                                Return to Home
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivationPage;
