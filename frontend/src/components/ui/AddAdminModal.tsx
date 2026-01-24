/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState, useEffect } from 'react';
import { FaUserPlus, FaTimes, FaUser, FaEnvelope, FaLock, FaBuilding, FaBriefcase, FaEye, FaEyeSlash, FaShieldAlt, FaPhone } from 'react-icons/fa';
import Button from './Button';
import { createAdminUser } from '../../services/user.api';
import { getLabs, getDesignations } from '../../services/settings.api';
import { useAuth } from '../../context/AuthContext';
import { FeatureCodes } from "../../constants";

interface AddAdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddAdminModal = ({ isOpen, onClose, onSuccess }: AddAdminModalProps) => {
    const { hasPermission } = useAuth();
    const isSuperadmin = hasPermission(FeatureCodes.FEATURE_SYSTEM_CONFIGURATION);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        labName: '',
        designation: '',
        mobileNo: '',
        role: 'Delegated Admin'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const [availableLabs, setAvailableLabs] = useState<string[]>([]);
    const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            const fetchSettings = async () => {
                const labsRes = await getLabs();
                if (labsRes.success) {
                    setAvailableLabs(labsRes.data.labs);
                }

                const designationsRes = await getDesignations();
                if (designationsRes.success) {
                    setAvailableDesignations(designationsRes.data.designations);
                }
            };
            fetchSettings();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await createAdminUser(formData);
            if (response.success) {
                onSuccess();
                onClose();
                setFormData({
                    fullName: '',
                    email: '',
                    password: '',
                    labName: '',
                    designation: '',
                    mobileNo: '',
                    role: 'Delegated Admin'
                });
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err?.message || "Failed to create Inter Lab sender");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 font-heading">
                        <FaUserPlus className="text-indigo-600" />
                        {isSuperadmin ? 'Add Inter Lab sender' : 'Add Delegated Admin'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                    >
                        <FaTimes />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {isSuperadmin && (
                            <div className="relative group">
                                <FaShieldAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                                <select
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm appearance-none font-bold text-indigo-900"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Inter Lab sender">Inter Lab sender (Full Rights)</option>
                                    <option value="Delegated Admin">Delegated Admin (Lab Restricted)</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500 text-xs">
                                    ▼
                                </div>
                            </div>
                        )}

                        <div className="relative group">
                            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                            <input
                                type="text"
                                placeholder="Full Name"
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            />
                        </div>

                        <div className="relative group">
                            <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                            <input
                                type="email"
                                placeholder="Email Address"
                                required
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="relative group">
                            <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                required
                                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1"
                            >
                                {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Additional Details</p>
                            <div className="space-y-4">
                                <div className="relative group">
                                    <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                                    <select
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm appearance-none"
                                        value={formData.labName}
                                        onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                                    >
                                        <option value="" disabled>Select Lab / Institution</option>
                                        {availableLabs.map((lab) => (
                                            <option key={lab} value={lab}>{lab}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">
                                        ▼
                                    </div>
                                </div>

                                <div className="relative group">
                                    <FaBriefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                                    <select
                                        required
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm appearance-none"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                    >
                                        <option value="" disabled>Select Designation</option>
                                        {availableDesignations.map((desig) => (
                                            <option key={desig} value={desig}>{desig}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">
                                        ▼
                                    </div>
                                </div>

                                <div className="relative group">
                                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors z-10" />
                                    <input
                                        type="text"
                                        placeholder="Mobile Number"
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-heading text-sm"
                                        value={formData.mobileNo}
                                        onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            label="Cancel"
                            onClick={onClose}
                            className="w-full sm:flex-1 py-2.5 font-bold"
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            label={isSuperadmin ? "Create Inter Lab sender" : "Create Delegated Admin"}
                            loading={loading}
                            disabled={loading}
                            className="w-full sm:flex-1 py-2.5 font-bold shadow-lg shadow-indigo-500/20"
                        />
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAdminModal;
