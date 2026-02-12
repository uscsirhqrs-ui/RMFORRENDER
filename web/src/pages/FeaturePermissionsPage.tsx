/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-19
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { FeatureCodes, SUPERADMIN_ROLE_NAME } from "../constants";
import {
    Shield,
    Loader2,
    AlertCircle
} from 'lucide-react';
import {
    getFeaturePermissions,
    updateFeaturePermissions
} from '../services/settings.api';
import { useAuth } from "../context/AuthContext";
import { useMessageBox } from '../context/MessageBoxContext';

const FeaturePermissionsPage: React.FC = () => {
    const { user: currentUser, hasPermission } = useAuth();
    const { showConfirm } = useMessageBox();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [featurePermissions, setFeaturePermissions] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchPermissions();
    }, []);

    // Access check
    useEffect(() => {
        if (currentUser && !hasPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION)) {
            navigate('/references/local');
        }
    }, [currentUser, hasPermission, navigate]);

    const fetchPermissions = async () => {
        setIsLoading(true);
        try {
            const res = await getFeaturePermissions();
            if (res.success) {
                setFeaturePermissions(res.data.permissions);
            }
        } catch (error) {
            console.error("Failed to fetch permissions", error);
            setMessage({ type: 'error', text: 'Failed to load permissions' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTogglePermission = async (featureKey: string, role: string) => {
        const sensitiveFeatures: string[] = [
            FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES,
            FeatureCodes.FEATURE_AUDIT_TRAILS,
            FeatureCodes.FEATURE_SYSTEM_CONFIGURATION
        ];

        // Warning for sensitive permissions
        if (sensitiveFeatures.includes(featureKey) && role !== SUPERADMIN_ROLE_NAME) {
            const currentItem = featurePermissions.find(p => p.feature === featureKey);
            const isGranting = currentItem && !currentItem.roles.includes(role);

            if (isGranting) {
                const confirmed = await showConfirm({
                    title: 'CRITICAL: Granting Sensitive Access',
                    message: (
                        <div className="space-y-4">
                            <p className="text-red-600 font-bold">
                                ⚠️ WARNING: You are about to grant administrative access to a non-Superadmin role.
                            </p>
                            <p className="text-gray-700">
                                Feature: <span className="font-bold underline">"{currentItem?.label || featureKey}"</span> for role <span className="font-bold underline">"{role}"</span>.
                            </p>
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800">
                                This feature grants high-level system access. Only Superadmins should typically have this access.
                                Granting this to other roles may compromise system security and data integrity.
                            </div>
                            <p className="font-medium">Are you sure you want to proceed?</p>
                        </div>
                    ),
                    type: 'warning',
                    confirmText: 'Yes, Grant Access',
                    cancelText: 'Cancel'
                });
                if (!confirmed) return;
            }
        }

        const updatedPermissions = featurePermissions.map(item => {
            if (item.feature === featureKey) {
                const hasRole = item.roles.includes(role);
                const newRoles = hasRole
                    ? item.roles.filter((r: string) => r !== role)
                    : [...item.roles, role];
                return { ...item, roles: newRoles };
            }
            return item;
        });

        // Optimistic update
        setFeaturePermissions(updatedPermissions);

        // API update
        const res = await updateFeaturePermissions(updatedPermissions);
        if (!res.success) {
            // Revert on failure
            const revertRes = await getFeaturePermissions();
            if (revertRes.success) setFeaturePermissions(revertRes.data.permissions);
            setMessage({ type: 'error', text: 'Failed to update permission' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
            <div className="mb-0">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 font-heading dark:text-white leading-none">
                    <Shield className="w-9 h-9 text-indigo-600 shrink-0" />
                    <span>Feature Access Control</span>
                </h1>
                <p className="text-gray-600 mt-2 text-lg dark:text-gray-400">Manage granular feature permissions for different user roles.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800'
                    }`}>
                    {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Permissions Matrix</h2>
                    </div>
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block p-6 overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
                                <th className="py-3 px-4 text-sm font-semibold text-gray-500 dark:text-gray-400">Feature</th>
                                {["User", "Inter Lab sender", "Delegated Admin", SUPERADMIN_ROLE_NAME].map(role => (
                                    <th key={role} className="py-3 px-4 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">{role}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {featurePermissions.map((item) => (
                                <tr key={item.feature} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="font-medium text-gray-800 dark:text-white">{item.label || item.feature}</div>
                                        <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                                    </td>
                                    {["User", "Inter Lab sender", "Delegated Admin", SUPERADMIN_ROLE_NAME].map(role => {
                                        const isChecked = item.roles.includes(role);
                                        return (
                                            <td key={role} className="py-4 px-4 text-center">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={isChecked}
                                                        onChange={() => handleTogglePermission(item.feature, role)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden p-4 space-y-4">
                    {featurePermissions.map((item) => (
                        <div key={item.feature} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <div className="mb-4">
                                <div className="font-bold text-gray-900 dark:text-white text-lg">{item.label || item.feature}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
                            </div>
                            <div className="space-y-4">
                                {["User", "Inter Lab sender", "Delegated Admin", SUPERADMIN_ROLE_NAME].map(role => {
                                    const isChecked = item.roles.includes(role);
                                    return (
                                        <div key={role} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{role}</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isChecked}
                                                    onChange={() => handleTogglePermission(item.feature, role)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FeaturePermissionsPage;
