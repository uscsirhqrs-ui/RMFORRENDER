/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

import {
    Search,
    Activity,
    ArrowRightLeft,
    Mail,
    ShieldAlert,
    Sparkles,
    Upload,
    Image as ImageIcon,
    Layers,
    Archive
} from 'lucide-react';
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { FeatureCodes } from '../constants';

import presidentImg from '../assets/images/presidentcsir.png';
import vicePresidentImg from '../assets/images/vicepresidentcsir.png';


export default function HomePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, hasPermission, isPermissionsLoading, isLoading } = useAuth();

    const isProfileIncomplete = !user?.labName || !user?.designation;
    const isApproved = user?.status === 'Approved';


    // Zero-flicker redirection for authenticated users
    if (!isLoading && isAuthenticated && user && !isPermissionsLoading && location.pathname === '/') {
        if (!isApproved || isProfileIncomplete) {
            return <Navigate to="/profile" replace state={{ message: "Your profile must be completed and approved by an administrator to access the portal features." }} />;
        }

        const canManageUsers = hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_OWN_OFFICE) || hasPermission(FeatureCodes.FEATURE_MANAGE_USERS_ALL_OFFICES);
        const canViewReferences = hasPermission(FeatureCodes.FEATURE_VIEW_OWN_OFFICE_SENDER) ||
            hasPermission(FeatureCodes.FEATURE_VIEW_INTER_OFFICE_SENDER) ||
            hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_OWN_OFFICE) ||
            hasPermission(FeatureCodes.FEATURE_MANAGE_LOCAL_REFERENCES_ALL_OFFICES) ||
            hasPermission(FeatureCodes.FEATURE_MANAGE_GLOBAL_REFERENCES);
        const canManageForms = hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT_OWN_LAB) || hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);

        if (canManageUsers) return <Navigate to="/users" replace />;
        if (canViewReferences) return <Navigate to="/references/local" replace />;
        if (canManageForms) return <Navigate to="/data-collection" replace />;

        return <Navigate to="/profile" replace />;
    }

    // Zero-flicker loading handler
    // We only show a loading screen if we definitely expect a redirect (authenticated user)
    // but the permissions aren't ready yet. Public users should see the Home Page instantly.
    if (isLoading || (isAuthenticated && (isPermissionsLoading || location.pathname === '/'))) {
        // If we have a user in local storage, we might show a brief "Redirecting" but only if we are on '/'
        // For public visitors (no user), we skip this entirely and render the page.
        if (isAuthenticated || isLoading) {
            return (
                <div className="flex items-center justify-center min-h-screen bg-slate-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium animate-pulse">
                            {isAuthenticated ? "Redirecting to your dashboard..." : "Setting up your workspace..."}
                        </p>
                    </div>
                </div>
            );
        }
    }

    const features = [
        {
            icon: <Sparkles className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-sparkle" />,
            title: 'AI Form Generation',
            description: 'Architect complex data collection forms instantly using natural language AI prompts.',
        },
        {
            icon: <Search className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-float" />,
            title: 'Smart Tracking',
            description: 'Locate any reference instantly using unique Ref IDs and advanced filtering capabilities.',
        },
        {
            icon: <ImageIcon className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-waggle" />,
            title: 'AI Vision Analysis',
            description: 'Digitalize physical forms instantly by converting photos into interactive data templates.',
        },
        {
            icon: <ArrowRightLeft className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-float" />,
            title: 'Movement History',
            description: 'Complete audit trail tracking the chronological movement and ownership of every reference.',
        },
        {
            icon: <Upload className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-pulse-soft" />,
            title: 'Data Collection Hub',
            description: 'A centralized portal for distributing forms and harvesting structured data across CSIR labs.',
        },
        {
            icon: <Activity className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-pulse-soft" />,
            title: 'Real-time Monitoring',
            description: 'Monitor status updates, remarks, and progress of references as they move through the workflow.',
        },
        {
            icon: <ShieldAlert className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-pulse-soft" />,
            title: 'Audit Trails',
            description: 'Detailed records of all system activities, ensuring full accountability and transparency.',
        },
        {
            icon: <Mail className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-ring-bell" />,
            title: 'Instant Notifications',
            description: 'Instant email alerts and acknowledgments for every reference creation, update, and movement.',
        },
        {
            icon: <Archive className="h-14 w-14 text-blue-700 fill-blue-700/20 stroke-[1.5] animate-pulse-soft" />,
            title: 'Digital Archiving',
            description: 'Securely archive and retrieve historical references with automated retention policies and quick access.',
        },
    ];

    const handleGetStarted = () => {
        navigate("/login");
    }

    return (
        <div className="flex flex-col bg-slate-50 min-h-screen w-full max-w-full relative overflow-x-hidden text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-linear-to-b from-indigo-50/80 to-transparent blur-3xl opacity-60" />
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-100/50 blur-[100px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-100/50 blur-[100px] mix-blend-multiply" />
            </div>

            {/* Floating Labs Effect */}
            {/* <FloatingLabs /> */}

            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 relative z-10">

                {/* HERO SECTION */}
                <section className="text-center mb-15 max-w-5xl mx-auto pt-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-sm font-medium text-indigo-700 uppercase bg-white border border-indigo-100 rounded-full shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-5 h-5 text-indigo-600 fill-indigo-600/30 animate-sparkle" />
                        <span>Next-Gen Reference Management</span>
                    </div>

                    <h1 className="font-heading text-4xl sm:text-7xl lg:text-8xl font-black tracking-normal mb-8 leading-[1.1] animate-in fade-in duration-1000 fill-mode-both text-slate-900">
                        <span className="animate-modern-shine bg-clip-text text-transparent bg-linear-to-br from-slate-900 via-slate-800 to-slate-600 inline-block animate-slide-in-left">
                            Intelligent Data.
                        </span>
                        <br />
                        <span className="animate-modern-shine font-black inline-block animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
                            Seamless Workflow.
                        </span>
                    </h1>

                    <p className="mt-6 text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-light animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-both">
                        A robust, centralized platform designed for the Council of Scientific and Industrial Research
                        to streamline tracking with efficiency and transparency.
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
                        <button
                            onClick={handleGetStarted}
                            className="group relative flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1"
                        >
                            Get Started
                            <ArrowRightLeft className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>

                    </div>
                </section>

                {/* VISUAL DIVIDER */}
                <div className="w-full h-px bg-linear-to-r from-transparent via-slate-200 to-transparent mb-10" />

                {/* FEATURES BENTO GRID */}
                <section className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
                            Powerful Features.
                        </h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                            Everything you need to manage references, integrated into one cohesive system.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature) => (
                            <Card key={feature.title} className="group bg-white border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 h-full">
                                <CardHeader className="p-10 flex flex-col items-center text-center h-full">
                                    <div className="mb-6 text-blue-700">
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="font-heading text-xl font-bold text-slate-900 mb-4">{feature.title}</CardTitle>
                                    <CardDescription className="text-slate-600 leading-loose text-base">
                                        {feature.description}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* LEADERSHIP SECTION */}
                <section className="max-w-7xl mx-auto mb-10 mt-20">
                    <div className="text-center mb-12">
                        <h2 className="font-heading text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
                            CSIR Leadership
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <Card className="group bg-white/60 backdrop-blur-sm border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden">
                            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <CardHeader className="p-6 md:p-7 flex flex-row items-center gap-4 md:gap-6 relative z-10">
                                <div className="relative shrink-0">
                                    <img
                                        src={presidentImg}
                                        alt="Shri Narendra Modi"
                                        className="relative w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-4 border-white shadow-md transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <CardTitle className="font-heading text-lg md:text-2xl font-black text-slate-900 mb-1">
                                        Shri Narendra Modi
                                    </CardTitle>
                                    <div className="flex flex-col">
                                        <span className="text-indigo-600 font-bold text-base md:text-lg flex items-center gap-2">
                                            Hon'ble Prime Minister
                                        </span>
                                        <span className="text-slate-500 font-medium text-xs md:text-sm">
                                            President, CSIR
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="group bg-white/60 backdrop-blur-sm border-slate-100 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden">
                            <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <CardHeader className="p-6 md:p-7 flex flex-row items-center gap-4 md:gap-6 relative z-10">
                                <div className="relative shrink-0">
                                    <img
                                        src={vicePresidentImg}
                                        alt="Dr. Jitendra Singh"
                                        className="relative w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-4 border-white shadow-md transition-transform duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <CardTitle className="font-heading text-lg md:text-2xl font-black text-slate-900 mb-1">
                                        Dr. Jitendra Singh
                                    </CardTitle>
                                    <div className="flex flex-col">
                                        <span className="text-indigo-600 font-bold text-base md:text-lg flex items-center gap-2">
                                            Hon'ble Minister of State
                                        </span>
                                        <span className="text-slate-500 font-medium text-xs md:text-sm">
                                            Vice President, CSIR
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>
                </section>
            </div>

            {/* SIMPLIFIED FOOTER DESIGN */}
            <div className="button-gradient mt-20 bg-indigo-700 pt-16 pb-8 relative z-10 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* White Brand Card */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-8 md:p-10 shadow-lg flex flex-col items-center justify-center gap-8 mb-12">
                        <div className="w-full text-center">
                            <div className="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-md">
                                    <Layers className="w-8 h-8 text-white" />
                                </div>
                                <span className="font-heading font-black text-2xl md:text-3xl text-slate-900 text-center">CSIR Reference Management Portal</span>
                            </div>
                            <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                                A centralized platform facilitating seamless reference management, enhancing transparency, and streamlining administrative workflows across all CSIR laboratories.
                            </p>
                            <div className="mt-8 flex flex-col items-center gap-3">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-full tracking-wide shadow-sm border border-blue-100">
                                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                    Under the Guidance of DG, CSIR
                                </div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-full tracking-wide shadow-sm border border-indigo-100">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                    An initiative of Joint Secretary(Admin), CSIR
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Simple Footer Text */}
                    <div className="border-t border-indigo-500/30 pt-8 text-center text-indigo-100/80">
                        <p className="font-medium mb-2 text-sm md:text-base">
                            Anusandhan Bhawan, 2 Rafi Marg, New Delhi - 110001
                        </p>
                        <p className="text-xs md:text-sm opacity-80">
                            © {new Date().getFullYear()} Council of Scientific and Industrial Research. All Rights Reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
