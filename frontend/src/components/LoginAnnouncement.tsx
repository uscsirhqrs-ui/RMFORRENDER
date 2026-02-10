/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { getSystemConfig } from '../services/systemConfig.api';
import { useAuth } from '../context/AuthContext';

const LoginAnnouncement: React.FC = () => {
    const { isAuthenticated, user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            if (!isAuthenticated || !user) {
                setIsVisible(false);
                return;
            }

            // Check if already dismissed for this user in this session
            const dismissalKey = `announcement_dismissed_${user._id}`;
            const isDismissed = sessionStorage.getItem(dismissalKey);

            if (isDismissed) {
                setIsVisible(false);
                setIsLoading(false);
                return;
            }

            try {
                const response = await getSystemConfig();
                if (response.success && response.data) {
                    const showMessage = response.data['SHOW_LOGIN_MESSAGE'];
                    const content = response.data['LOGIN_MESSAGE_CONTENT'];

                    if (showMessage && content) {
                        setMessage(content);
                        setIsVisible(true);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch announcement config", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnnouncement();
    }, [isAuthenticated, user]);

    const handleDismiss = () => {
        if (user) {
            const dismissalKey = `announcement_dismissed_${user._id}`;
            sessionStorage.setItem(dismissalKey, 'true');
        }
        setIsVisible(false);
    };

    if (!isAuthenticated || !isVisible || isLoading) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm transform transition-all animate-in zoom-in-95 duration-300">
                {/* Red Pin */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                    <div className="relative">
                        <div className="w-8 h-8 bg-red-600 rounded-full shadow-lg border-2 border-red-700 flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-400 rounded-full opacity-50 blur-[1px]"></div>
                        </div>
                        <div className="absolute top-7 left-1/2 -translate-x-1/2 w-1 h-6 bg-linear-to-b from-gray-400 to-transparent opacity-40"></div>
                    </div>
                </div>

                {/* Sticky Note */}
                <div className="bg-[#feff9c] p-8 pb-10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-t border-l border-white/30 relative overflow-hidden group">
                    {/* Folded Corner Effect */}
                    <div className="absolute bottom-0 right-0 w-12 h-12 bg-linear-to-tl from-black/10 via-yellow-200/50 to-transparent"></div>
                    <div className="absolute bottom-0 right-0 w-0 h-0 border-t-48 border-t-transparent border-r-48 border-r-white/20"></div>

                    {/* Subtle Paper Texture */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

                    {/* Close Button */}
                    <button
                        onClick={handleDismiss}
                        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-800 hover:bg-black/5 rounded-full transition-colors z-20"
                        title="Dismiss"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4 text-gray-800/60 uppercase tracking-widest text-[10px] font-bold">
                            <Pin className="w-3 h-3 rotate-45" />
                            <span>System Announcement</span>
                        </div>

                        <div className="font-mono text-gray-800 text-lg leading-relaxed whitespace-pre-wrap italic">
                            {message}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleDismiss}
                                className="px-5 py-2 bg-black/10 hover:bg-black/20 text-gray-800 font-bold text-sm rounded transition-all transform active:scale-95 shadow-sm border border-black/5"
                            >
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginAnnouncement;
