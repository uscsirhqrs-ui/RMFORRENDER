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
import {
    Save,
    Loader2,
    Settings,
    AlertCircle,
    FileText,
    Shield,
    Plus,
    Trash2,
    Globe,
    Building2,
    Briefcase,
    ArrowUp,
    ArrowDown,
    Users,
    Archive,
    History,
    RefreshCw,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';
import { getSystemConfig, updateSystemConfig } from '../services/systemConfig.api';
import { getArchivableCount, performArchiving } from '../services/archive.api';
import {
    getAllowedDomains,
    updateAllowedDomains,
    getLabs,
    updateLabs,
    getDesignations,
    updateDesignations,
    getDivisions,
    updateDivisions
} from '../services/settings.api';
import InputField from '../components/ui/InputField';
import { toast } from 'react-hot-toast';

const SystemSettingsPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Application Limits State
    const [remarksLimit, setRemarksLimit] = useState('150');

    // Archiving State
    const [retentionDays, setRetentionDays] = useState('365');
    const [isAutoArchiveEnabled, setIsAutoArchiveEnabled] = useState(false);
    const [archiveCutoffDate, setArchiveCutoffDate] = useState('');
    const [archivableCount, setArchivableCount] = useState<number | null>(null);
    const [isCalculatingArchive, setIsCalculatingArchive] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    // Domain Whitelisting State
    const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [loadingDomains, setLoadingDomains] = useState(false);

    // Labs State
    const [labs, setLabs] = useState<string[]>([]);
    const [newLab, setNewLab] = useState('');
    const [loadingLabs, setLoadingLabs] = useState(false);

    const [designations, setDesignations] = useState<string[]>([]);
    const [newDesignation, setNewDesignation] = useState('');
    const [loadingDesignations, setLoadingDesignations] = useState(false);

    // Divisions State
    const [divisions, setDivisions] = useState<string[]>([]);
    const [newDivision, setNewDivision] = useState('');
    const [loadingDivisions, setLoadingDivisions] = useState(false);

    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                fetchConfigs(),
                fetchAllowedDomains(),
                fetchLabs(),
                fetchDesignations(),
                fetchDivisions()
            ]);
        } catch (error) {
            console.error("Failed to fetch settings", error);
            setMessage({ type: 'error', text: 'Failed to load some system settings' });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchConfigs = async () => {
        const response = await getSystemConfig();
        if (response.success && response.data) {
            if (response.data['REMARKS_WORD_LIMIT']) {
                setRemarksLimit(String(response.data['REMARKS_WORD_LIMIT']));
            }
            if (response.data['ARCHIVE_RETENTION_DAYS']) {
                setRetentionDays(String(response.data['ARCHIVE_RETENTION_DAYS']));
            }
            if (response.data['AUTO_ARCHIVE_ENABLED'] !== undefined) {
                setIsAutoArchiveEnabled(response.data['AUTO_ARCHIVE_ENABLED']);
            }
        }
    };

    const fetchLabs = async () => {
        setLoadingLabs(true);
        const res = await getLabs();
        if (res.success) {
            setLabs(res.data.labs);
        }
        setLoadingLabs(false);
    };

    const fetchDesignations = async () => {
        setLoadingDesignations(true);
        const res = await getDesignations();
        if (res.success) {
            setDesignations(res.data.designations);
        }
        setLoadingDesignations(false);
    };

    const fetchDivisions = async () => {
        setLoadingDivisions(true);
        const res = await getDivisions();
        if (res.success) {
            setDivisions(res.data.divisions);
        }
        setLoadingDivisions(false);
    };

    const fetchAllowedDomains = async () => {
        setLoadingDomains(true);
        const res = await getAllowedDomains();
        if (res.success) {
            setAllowedDomains(res.data.allowedDomains);
        }
        setLoadingDomains(false);
    };

    const handleSaveLimits = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        try {
            const updates = {
                'REMARKS_WORD_LIMIT': Number(remarksLimit),
                'ARCHIVE_RETENTION_DAYS': Number(retentionDays),
                'AUTO_ARCHIVE_ENABLED': isAutoArchiveEnabled
            };

            const response = await updateSystemConfig(updates);
            if (response.success) {
                setMessage({ type: 'success', text: 'Settings updated successfully' });
                toast.success('System settings updated');
            } else {
                setMessage({ type: 'error', text: response.message || 'Failed to update settings' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An unexpected error occurred' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCalculateArchivable = async () => {
        if (!archiveCutoffDate) return;
        setIsCalculatingArchive(true);
        try {
            const res = await getArchivableCount(archiveCutoffDate);
            if (res.success) {
                setArchivableCount(res.data.count);
            }
        } catch (error) {
            toast.error("Failed to calculate archivable documents");
        } finally {
            setIsCalculatingArchive(false);
        }
    };

    const handlePerformArchiving = async () => {
        if (!archiveCutoffDate || archivableCount === 0) return;

        if (!window.confirm(`Are you sure you want to archive ${archivableCount} closed references? This will move them to archive collections and removed from active collections.`)) {
            return;
        }

        setIsArchiving(true);
        try {
            const res = await performArchiving(archiveCutoffDate);
            if (res.success) {
                toast.success(`Succesfully archived ${res.data.total} references`);
                setArchiveCutoffDate('');
                setArchivableCount(null);
            } else {
                toast.error(res.message);
            }
        } catch (error: any) {
            toast.error("Archiving failed: " + error.message);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain) return;
        const domain = newDomain.trim().toLowerCase();

        if (!domain.includes('.') || domain.includes('@')) {
            toast.error("Please enter a valid domain (e.g., csir.res.in)");
            return;
        }

        if (allowedDomains.includes(domain)) {
            toast.error("Domain already allowed");
            return;
        }

        const updated = [...allowedDomains, domain];
        try {
            const res = await updateAllowedDomains(updated);
            if (res.success) {
                setAllowedDomains(res.data.allowedDomains);
                setNewDomain('');
                toast.success("Domain added successfully");
            }
        } catch (error: any) {
            console.error("Error adding domain:", error);
            toast.error("Failed to add domain");
        }
    };

    const handleRemoveDomain = async (domainToRemove: string) => {
        const updated = allowedDomains.filter(d => d !== domainToRemove);
        const res = await updateAllowedDomains(updated);
        if (res.success) {
            setAllowedDomains(res.data.allowedDomains);
        }
    };

    const handleAddLab = async () => {
        if (!newLab) return;
        const lab = newLab.trim();
        if (labs.includes(lab)) {
            toast.error("Lab already exists");
            return;
        }

        const updated = [...labs, lab];
        const res = await updateLabs(updated);
        if (res.success) {
            setLabs(res.data.labs);
            setNewLab('');
        }
    };

    const handleRemoveLab = async (labToRemove: string) => {
        const updated = labs.filter(l => l !== labToRemove);
        const res = await updateLabs(updated);
        if (res.success) {
            setLabs(res.data.labs);
        }
    };

    const handleAddDesignation = async () => {
        if (!newDesignation) return;
        const desig = newDesignation.trim();
        if (designations.includes(desig)) {
            toast.error("Designation already exists");
            return;
        }

        const updated = [...designations, desig];
        const res = await updateDesignations(updated);
        if (res.success) {
            setDesignations(res.data.designations);
            setNewDesignation('');
        }
    };

    const handleRemoveDesignation = async (desigToRemove: string) => {
        const updated = designations.filter(d => d !== desigToRemove);
        const res = await updateDesignations(updated);
        if (res.success) {
            setDesignations(res.data.designations);
        }
    };

    const handleAddDivision = async () => {
        if (!newDivision) return;
        const div = newDivision.trim();
        if (divisions.includes(div)) {
            toast.error("Division already exists");
            return;
        }

        const updated = [...divisions, div];
        const res = await updateDivisions(updated);
        if (res.success) {
            setDivisions(res.data.divisions);
            setNewDivision('');
        }
    };

    const handleRemoveDivision = async (divToRemove: string) => {
        const updated = divisions.filter(d => d !== divToRemove);
        const res = await updateDivisions(updated);
        if (res.success) {
            setDivisions(res.data.divisions);
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
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
            <div className="mb-0">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 font-heading dark:text-white leading-none">
                    <Settings className="w-9 h-9 text-indigo-600 shrink-0" />
                    <span>System Configuration</span>
                </h1>
                <p className="text-gray-600 mt-2 text-lg dark:text-gray-400">Manage global system configurations, limits, and security settings.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-2 border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/10 dark:text-green-400 dark:border-green-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800'
                    }`}>
                    {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Application Limits */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Application Limits</h2>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSaveLimits} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <InputField
                                    id="remarksLimit"
                                    label="Remarks Word Limit"
                                    type="number"
                                    value={remarksLimit}
                                    onChange={(e) => setRemarksLimit(e.target.value)}
                                    placeholder="e.g. 150"
                                    min="10"
                                    max="1000"
                                    required
                                    icon={<FileText className="w-4 h-4 text-gray-400" />}
                                />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Maximum number of words allowed in the remarks field globally.
                                </p>
                            </div>

                            <div>
                                <InputField
                                    id="retentionDays"
                                    label="Archive Retention Period (Days)"
                                    type="number"
                                    value={retentionDays}
                                    onChange={(e) => setRetentionDays(e.target.value)}
                                    placeholder="e.g. 365"
                                    min="30"
                                    required
                                    icon={<History className="w-4 h-4 text-gray-400" />}
                                />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    Closed references older than this will be archived.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <RefreshCw className={`w-5 h-5 ${isAutoArchiveEnabled ? 'text-emerald-500 animate-spin-slow' : 'text-gray-400'}`} />
                                <div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white leading-none">Enable Automated Archiving</p>
                                    <p className="text-xs text-gray-500 mt-1">System will periodically archive references automatically.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAutoArchiveEnabled(!isAutoArchiveEnabled)}
                                className={`p-1 rounded-lg transition-all ${isAutoArchiveEnabled ? 'text-emerald-500' : 'text-gray-400'}`}
                            >
                                {isAutoArchiveEnabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving...' : 'Save All Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Manual Archiving Utility */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Archive className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Manual Archiving Utility</h2>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase rounded-full border border-amber-100">
                        Admin Only
                    </span>
                </div>

                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cutoff Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={archiveCutoffDate}
                                    onChange={(e) => {
                                        setArchiveCutoffDate(e.target.value);
                                        setArchivableCount(null);
                                    }}
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>
                            <p className="text-xs text-gray-500 italic">References closed before this date will be scanned.</p>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCalculateArchivable}
                                disabled={!archiveCutoffDate || isCalculatingArchive}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isCalculatingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan Documents'}
                            </button>

                            <button
                                type="button"
                                onClick={handlePerformArchiving}
                                disabled={!archivableCount || archivableCount === 0 || isArchiving}
                                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isArchiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                {isArchiving ? 'Archiving...' : `Archive ${archivableCount || 0} Items`}
                            </button>
                        </div>
                    </div>

                    {archivableCount !== null && (
                        <div className={`mt-6 p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 ${archivableCount > 0 ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                            <div className={`p-3 rounded-xl ${archivableCount > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                                <History className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="font-bold text-lg leading-tight">
                                    {archivableCount > 0
                                        ? `Found ${archivableCount} archivable documents.`
                                        : "No closed documents found for the selected cutoff."
                                    }
                                </p>
                                <p className="text-sm opacity-80">
                                    {archivableCount > 0
                                        ? "Proceed to archive these items. This action is irreversible via UI."
                                        : "Your primary database is already lean for this period!"
                                    }
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* System Security */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">System Security</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Allowed Email Domains</label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Restrict registration and login to specific domains.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="e.g. csir.res.in"
                                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                            />
                            <button
                                type="button"
                                onClick={handleAddDomain}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                            >
                                <Plus className="w-5 h-5" /> Add
                            </button>
                        </div>

                        {loadingDomains ? (
                            <div className="py-2 text-center text-gray-400 animate-pulse">Loading domains...</div>
                        ) : allowedDomains.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {allowedDomains.map(domain => (
                                    <div key={domain} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-lg shadow-sm">
                                        <Globe className="w-4 h-4 text-indigo-500" />
                                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{domain}</span>
                                        <button onClick={() => handleRemoveDomain(domain)} className="text-indigo-300 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-4 text-center bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                                No restricted domains. All domains allowed.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Labs Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Manage Labs / Institutions</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newLab}
                            onChange={(e) => setNewLab(e.target.value)}
                            placeholder="e.g. CSIR-NCL"
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddLab()}
                        />
                        <button onClick={handleAddLab} className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium">
                            <Plus className="w-5 h-5" /> Add Lab
                        </button>
                    </div>
                    {loadingLabs ? (
                        <div className="py-2 text-center text-gray-400">Loading labs...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                            {labs.map(lab => (
                                <div key={lab} className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{lab}</span>
                                    <button onClick={() => handleRemoveLab(lab)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Designations Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Manage Designations</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newDesignation}
                            onChange={(e) => setNewDesignation(e.target.value)}
                            placeholder="e.g. Scientist"
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDesignation()}
                        />
                        <button onClick={handleAddDesignation} className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium">
                            <Plus className="w-5 h-5" /> Add
                        </button>
                    </div>
                    {loadingDesignations ? (
                        <div className="py-2 text-center text-gray-400">Loading designations...</div>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto p-1 custom-scrollbar">
                            {designations.map((desig, index) => (
                                <div key={desig} className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-1">{desig}</span>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                if (index > 0) {
                                                    const newOrder = [...designations];
                                                    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                    updateDesignations(newOrder).then(res => {
                                                        if (res.success) setDesignations(res.data.designations);
                                                    });
                                                }
                                            }}
                                            disabled={index === 0}
                                            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (index < designations.length - 1) {
                                                    const newOrder = [...designations];
                                                    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                                    updateDesignations(newOrder).then(res => {
                                                        if (res.success) setDesignations(res.data.designations);
                                                    });
                                                }
                                            }}
                                            disabled={index === designations.length - 1}
                                            className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                        <button onClick={() => handleRemoveDesignation(desig)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Divisions Management */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-indigo-600 shrink-0 mt-[1.5px]" />
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white font-heading m-0">Manage Divisions / Sections</h2>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={newDivision}
                            onChange={(e) => setNewDivision(e.target.value)}
                            placeholder="e.g. Finance & Accounts"
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddDivision()}
                        />
                        <button onClick={handleAddDivision} className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium">
                            <Plus className="w-5 h-5" /> Add Division
                        </button>
                    </div>
                    {loadingDivisions ? (
                        <div className="py-2 text-center text-gray-400">Loading divisions...</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1 custom-scrollbar">
                            {divisions.map(div => (
                                <div key={div} className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{div}</span>
                                    <button onClick={() => handleRemoveDivision(div)} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
};

export default SystemSettingsPage;
