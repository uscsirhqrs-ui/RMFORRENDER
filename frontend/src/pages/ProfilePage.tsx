/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useAuth } from '../context/AuthContext';
import { Mail, Shield, Camera, Save, X, Building2, UserCircle, Briefcase, Bell } from 'lucide-react';
import ChangePasswordModal from '../components/ui/ChangePasswordModal';
import Button from '../components/ui/Button';
import { useState, useEffect, useMemo } from 'react';
import { updateProfile, updateAvatar, getUserById } from '../services/user.api';
import { getLabs, getDesignations, getDivisions } from '../services/settings.api';
import DropDownWithSearch from '../components/ui/DropDownWithSearch';

import { useLocation, useParams } from 'react-router-dom';

const ProfilePage = () => {
    const { user: currentUser, login } = useAuth();
    const location = useLocation();
    const { userId } = useParams();
    const [user, setUser] = useState<any>(null);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(location.state?.message || null);

    // Form state
    const [fullName, setFullName] = useState("");
    const [labName, setLabName] = useState("");
    const [designation, setDesignation] = useState("");
    const [division, setDivision] = useState("");
    const [mobileNo, setMobileNo] = useState("");

    const [availableLabs, setAvailableLabs] = useState<string[]>([]);
    const [availableDesignations, setAvailableDesignations] = useState<string[]>([]);
    const [availableDivisions, setAvailableDivisions] = useState<string[]>([]);

    const isOwnProfile = !userId || userId === currentUser?._id;

    // Fetch user profile if viewing another user
    useEffect(() => {
        const fetchUserProfile = async () => {
            if (userId && userId !== currentUser?._id) {
                setIsLoading(true);
                try {
                    const response = await getUserById(userId);
                    if (response.success) {
                        setUser({
                            ...response.data,
                            initials: response.data.fullName.slice(0, 2).toUpperCase() || response.data.email.slice(0, 2).toUpperCase()
                        });
                    } else {
                        setError(response.message);
                    }
                } catch (err) {
                    setError("Failed to fetch user profile");
                } finally {
                    setIsLoading(false);
                }
            } else {
                setUser(currentUser);
            }
        };
        fetchUserProfile();
    }, [userId, currentUser]);

    // Keep form state in sync with context user (important after avatar upload or other updates)
    useEffect(() => {
        if (user) {
            setFullName(user.fullName || "");
            setLabName(user.labName || "");
            setDesignation(user.designation || "");
            setDivision(user.division || "");
            setMobileNo(user.mobileNo || "");
        }
    }, [user]);

    const availableLabsOptions = useMemo(() =>
        availableLabs.map(lab => ({ label: lab, value: lab })),
        [availableLabs]
    );

    const availableDesignationsOptions = useMemo(() =>
        availableDesignations.map(desig => ({ label: desig, value: desig })),
        [availableDesignations]
    );

    const availableDivisionsOptions = useMemo(() =>
        availableDivisions.map(div => ({ label: div, value: div })),
        [availableDivisions]
    );

    useEffect(() => {
        const fetchSettings = async () => {
            const labsRes = await getLabs();
            if (labsRes.success) {
                setAvailableLabs(labsRes.data.labs);
            }

            const designationsRes = await getDesignations();
            if (designationsRes.success) {
                setAvailableDesignations(designationsRes.data.designations);
            }

            const divisionsRes = await getDivisions();
            if (divisionsRes.success) {
                setAvailableDivisions(divisionsRes.data.divisions);
            }
        };
        fetchSettings();
    }, []);

    if (!user) {
        return <div className="flex justify-center items-center h-full">Loading profile...</div>;
    }

    const handleSaveProfile = async (isSubmitting = false) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            if (!fullName || fullName.trim() === "") {
                setError("Full Name is required");
                setIsLoading(false);
                return;
            }

            if (!labName) {
                setError("Lab Name is required");
                setIsLoading(false);
                return;
            }

            if (!designation) {
                setError("Designation is required");
                setIsLoading(false);
                return;
            }

            if (!division) {
                setError("Division / Section is required");
                setIsLoading(false);
                return;
            }

            // Mobile number validation
            if (!mobileNo || !/^\d+$/.test(mobileNo) || mobileNo.length !== 10) {
                setError("Mobile number must be exactly 10 digits and numeric only");
                setIsLoading(false);
                return;
            }
            const payload: any = { fullName, labName, designation, division, mobileNo };
            if (isSubmitting) {
                payload.isSubmitted = true;
            }

            const response = await updateProfile(payload);
            if (response.success) {
                setSuccessMessage(response.message);
                setError(null);

                // Update context with many fields to ensure consistency
                const updatedUser = {
                    ...currentUser,
                    ...response.data,
                    initials: fullName.slice(0, 2).toUpperCase() || (currentUser?.email || "").slice(0, 2).toUpperCase(),
                };

                login(updatedUser);
                setIsEditing(false);

                // If status changed to Pending (from Approved), show a specific alert or reload to enforce restrictions
                if (user.status === 'Approved' && response.data.status === 'Pending') {
                    setSuccessMessage("Changes saved. Your profile is now pending approval by an administrator.");
                    // Scroll to top to see the status alert
                    window.scrollTo(0, 0);
                }
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || "Failed to update profile");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 20KB limit check
        if (file.size > 20 * 1024) {
            setError("Image size must be less than 20KB");
            return;
        }

        const formData = new FormData();
        formData.append('avatar', file);

        setIsLoading(true);
        setError(null);
        try {
            const response = await updateAvatar(formData);
            if (response.success) {
                setSuccessMessage("Avatar updated successfully");
                if (currentUser) {
                    login({ ...currentUser, avatar: response.data.avatar });
                }
            } else {
                setError(response.message);
            }
        } catch (err: any) {
            setError(err.message || "Failed to upload avatar");
        } finally {
            setIsLoading(false);
        }
    };

    const isProfileComplete = user.labName && user.designation && user.division && user.fullName && user.fullName.trim() !== "" && user.mobileNo;
    const showSubmitButton = user.status !== 'Approved' && isProfileComplete && !user.isSubmitted;
    const showSubmittedAlert = user.status !== 'Approved' && user.isSubmitted;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-gray-100">
                {/* Header Banner */}
                <div className="h-48 bg-linear-to-r from-indigo-600 to-indigo-700 relative">
                    <div className="absolute -bottom-16 left-8">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center text-4xl font-bold text-indigo-600 select-none overflow-hidden group">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
                                ) : (
                                    user.initials
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            {isOwnProfile && (
                                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full hover:bg-gray-50 transition-colors shadow-md border border-gray-200 group cursor-pointer">
                                    <Camera className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={isLoading}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                </div>

                {/* Profile Content */}
                <div className="pt-20 px-8 pb-8">
                    {/* Status Alert for Pending/Incomplete Users */}
                    {user.status !== 'Approved' && !user.isSubmitted && (
                        <div className={`mb-8 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-500 ${user.status === 'Rejected'
                            ? "bg-red-50 border-red-200 text-red-800"
                            : !user.labName || !user.designation || !user.division || !user.fullName || !user.mobileNo
                                ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className={`mt-1 p-1 rounded-full ${user.status === 'Rejected' ? "bg-red-100" : !user.labName || !user.designation || !user.division || !user.fullName || !user.mobileNo ? "bg-indigo-100" : "bg-amber-100"
                                    }`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">
                                        {user.status === 'Rejected' ? "Account Rejected" :
                                            !user.labName || !user.designation || !user.division || !user.fullName || !user.mobileNo ? "Complete Your Profile" :
                                                "Profile Complete - Ready for Submission"}
                                    </p>
                                    <p className="text-sm opacity-90 mt-0.5">
                                        {user.status === 'Rejected' ? "Your account was rejected. Please update your information and submit again for review." :
                                            !user.labName || !user.designation || !user.division || !user.fullName || !user.mobileNo ? (
                                                <>
                                                    Please provide all details (Name, Lab, Designation, Division, Mobile) to enable account submission.
                                                    <br />
                                                    <strong>Click Edit Profile button to fill/update the details.</strong>
                                                </>
                                            ) :
                                                "Your profile is ready! Click the 'Submit for Approval' button to notify the administrator."}
                                    </p>

                                    {/* Submit for Approval Button */}
                                    {showSubmitButton && (
                                        <div className="mt-4">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleSaveProfile(true)}
                                                loading={isLoading}
                                                disabled={isLoading}
                                            >
                                                Submit for Approval
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Final "Submitted" Confirmation / Awaiting Approval State */}
                    {showSubmittedAlert && (
                        <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 rounded-full bg-green-100">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">Application Submitted Successfully</p>
                                    <p className="text-sm opacity-90 mt-0.5">
                                        Your profile is now complete and has been sent to the administrator for review. You will receive email notification once approved. Logout and Login again to access the portal after the approval.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{user.fullName || "Guest"}</h1>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {user.availableRoles && user.availableRoles.length > 0 ? (
                                    user.availableRoles.map((role: string) => (
                                        <span key={role} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${role === user.role
                                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-500/20'
                                            : 'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                            <Shield className="w-3 h-3" />
                                            {role}
                                            {role === user.role && <span className="ml-1 text-[10px] uppercase font-bold tracking-wider">(Active)</span>}
                                        </span>
                                    ))
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        {user.role || "User"}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {/* Secondary Logout for Restricted Users */}
                            {isOwnProfile && user.status !== 'Approved' && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        localStorage.removeItem('user');
                                        window.location.href = '/login';
                                    }}
                                >
                                    Log Out
                                </Button>
                            )}
                            {isOwnProfile && (!isEditing ? (
                                <Button
                                    variant="primary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit Profile
                                </Button>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsEditing(false)}
                                        icon={<X className="w-4 h-4" />}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => handleSaveProfile(false)}
                                        disabled={isLoading}
                                        loading={isLoading}
                                        icon={!isLoading && <Save className="w-4 h-4" />}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {notice && (
                        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2 flex justify-between items-center tracking-wide">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-500" />
                                {notice}
                            </div>
                            <button onClick={() => setNotice(null)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium animate-shake">
                            {error}
                        </div>
                    )}

                    {successMessage && !error && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            {successMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Information Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <UserCircle className="w-5 h-5 text-indigo-500" />
                                Personal Information
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Full Name <span className="text-red-500">*</span></label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Enter your full name"
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-gray-900">
                                            {user.fullName || "Not provided"}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Lab Name <span className="text-red-500">*</span></label>
                                    {isEditing ? (
                                        <DropDownWithSearch
                                            options={availableLabsOptions}
                                            placeholder="Select your lab"
                                            selectedValue={labName}
                                            onChange={(value) => setLabName(value)}
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-gray-900 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            {user.labName || "Not selected"}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Designation <span className="text-red-500">*</span></label>
                                    {isEditing ? (
                                        <DropDownWithSearch
                                            options={availableDesignationsOptions}
                                            placeholder="Select your designation"
                                            selectedValue={designation}
                                            onChange={(value) => setDesignation(value)}
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-gray-900 flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-gray-400" />
                                            {user.designation || "Not provided"}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Division / Section <span className="text-red-500">*</span></label>
                                    {isEditing ? (
                                        <DropDownWithSearch
                                            options={availableDivisionsOptions}
                                            placeholder="Select your division / section"
                                            selectedValue={division}
                                            onChange={(value) => setDivision(value)}
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-gray-900 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                            {user.division || "Not provided"}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Mobile No <span className="text-red-500">*</span></label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={mobileNo}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                if (value.length <= 10) {
                                                    setMobileNo(value);
                                                }
                                            }}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Enter 10-digit mobile number"
                                            maxLength={10}
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                        />
                                    ) : (
                                        <div className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl font-medium text-gray-900 flex items-center gap-2">
                                            {user.mobileNo || "Not provided"}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-500 block mb-1.5 ml-1">Email Address</label>
                                    <div className="px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl font-medium text-gray-500 flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        {user.email}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 ml-1">Email cannot be changed</p>
                                </div>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                Account Security
                            </h2>

                            <div className="space-y-4">
                                <div className={`p-4 ${user.status === 'Approved' ? 'bg-green-50/50 border-green-100' :
                                    user.status === 'Pending' ? 'bg-amber-50/50 border-amber-100' :
                                        'bg-red-50/50 border-red-100'
                                    } border rounded-xl group hover:bg-opacity-75 transition-colors`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${user.status === 'Approved' ? 'bg-green-500 animate-pulse' :
                                                user.status === 'Pending' ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]' :
                                                    'bg-red-500'
                                                }`}></div>
                                            <span className="text-sm font-semibold text-gray-700">Account status: {user.status}</span>
                                        </div>
                                    </div>
                                </div>

                                {isOwnProfile && (
                                    <div className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                                        <h3 className="text-sm font-bold text-gray-800 mb-3">Password Management</h3>
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Regularly changing your password helps keep your account secure from unauthorized access.
                                        </p>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setIsChangePasswordOpen(true)}
                                            fullWidth
                                            size="md"
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
            />
        </div>
    );
};

export default ProfilePage;
