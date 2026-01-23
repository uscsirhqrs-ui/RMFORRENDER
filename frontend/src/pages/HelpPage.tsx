/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React from 'react';
import {
    FileStack,
    Users,
    Settings as SettingsIcon,
    UserCircle,
    ArrowRight,
    HelpCircle,
    ShieldCheck,
    Bell,
    CheckCircle2,
    Clock,
    Filter,
    Sparkles,
    FileText,
    Search,
    Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';

const HelpPage: React.FC = () => {
    const sections = [
        {
            title: "Global References Management",
            icon: FileStack,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            description: "The centralized repository. Search, request, and manage references across the entire CSIR network.",
            steps: [
                { icon: Search, text: "Search across all CSIR labs instantly" },
                { icon: Bell, text: "Receive and process reference requests from other labs" },
                { icon: Users, text: "Bulk assign incoming global references to your team" }
            ]
        },
        {
            title: "Local References Management",
            icon: FileText,
            color: "text-pink-600",
            bg: "bg-pink-50",
            description: "Lab-specific filing. Manage your internal files, movements, and assignments efficiently.",
            steps: [
                { icon: Clock, text: "Track local file movements and status changes" },
                { icon: Users, text: "Mark multiple files to colleagues using Bulk Update" },
                { icon: Filter, text: "Advanced filtering for finding specific local documents" }
            ]
        },
        {
            title: "User Control & Admin",
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            description: "Admins and Delegated Admins can oversee users and manage laboratory-wide access.",
            steps: [
                { icon: ShieldCheck, text: "Review and approve new user registrations for your lab" },
                { icon: Users, text: "Bulk manage user statuses and roles" },
                { icon: CheckCircle2, text: "Audit trail: Monitor full history of security events and changes" },
                { icon: ShieldCheck, text: "Assign precise roles like 'Delegated Admin' or 'Inter Lab Sender'" }
            ]
        },
        {
            title: "Dynamic Personalization",
            icon: SettingsIcon,
            color: "text-amber-600",
            bg: "bg-amber-50",
            description: "Make the portal your own with advanced theme and UI customization.",
            steps: [
                { icon: SettingsIcon, text: "Switch between Light, Dark, and System themes" },
                { icon: UserCircle, text: "Choose from 5 different accent colors (Indigo, Rose, etc.)" },
                { icon: ArrowRight, text: "Adjust font sizes for optimal reading comfort" }
            ]
        },
        {
            title: "Data Collection Hub",
            icon: Sparkles,
            color: "text-purple-600",
            bg: "bg-purple-50",
            description: "Architect and distribute data collection forms with cutting-edge AI tools.",
            steps: [
                { icon: Users, text: "Collaborate via Shared Forms with Archiving & Restoration support" },
                { icon: Sparkles, text: "Generate complex forms instantly using simple AI prompts" },
                { icon: CheckCircle2, text: "Perform bulk actions: Archive, Restore, or Delete multiple forms at once" }
            ]
        },
        {
            title: "Background Operations",
            icon: Bell,
            color: "text-blue-600",
            bg: "bg-blue-50",
            description: "Stay informed with real-time updates on long-running system tasks.",
            steps: [
                { icon: Clock, text: "Monitor bulk email distribution progress in real-time" },
                { icon: Bell, text: "Receive system notifications when large tasks complete" },
                { icon: CheckCircle2, text: "Continue working while the system processes data in the background" }
            ]
        },
        {
            title: "Feature Access Control",
            icon: Shield,
            color: "text-orange-600",
            bg: "bg-orange-50",
            description: "Granular control over system capabilities. Enable or disable modules for specific user roles.",
            steps: [
                { icon: Shield, text: "Configure permission matrices for all system roles" },
                { icon: CheckCircle2, text: "Toggle critical features like 'Audit Trails' or 'System Config'" },
                { icon: Users, text: "Real-time updates to user capabilities without deployment" }
            ]
        }
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-2">
                    <HelpCircle className="w-10 h-10" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-heading tracking-tight">
                    How to use the Portal
                </h1>
                <p className="max-w-2xl mx-auto text-xl text-gray-600 font-heading">
                    A quick visual guide to understanding the features and workflow of our Reference Management Portal.
                </p>
            </div>

            {/* Main Infographic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                {sections.map((section, idx) => {
                    const Icon = section.icon;
                    return (
                        <div
                            key={idx}
                            className="flex flex-col h-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 dark:bg-gray-800 dark:border-gray-700 dark:shadow-none"
                        >
                            <div className={`p-4 rounded-2xl ${section.bg} ${section.color} w-fit mb-6 dark:bg-opacity-10`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-heading dark:text-white">
                                {section.title}
                            </h2>
                            <p className="text-gray-600 mb-8 font-heading leading-relaxed dark:text-gray-400">
                                {section.description}
                            </p>

                            <div className="mt-auto space-y-4 pt-6 border-t border-gray-50 dark:border-gray-700">
                                {section.steps.map((step, sIdx) => {
                                    const StepIcon = step.icon;
                                    return (
                                        <div key={sIdx} className="flex gap-3 items-start group">
                                            <div className="mt-1 p-1 rounded-md bg-gray-50 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors dark:bg-gray-700">
                                                <StepIcon className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm text-gray-600 font-heading dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                                                {step.text}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Links Section */}
            <div className="bg-indigo-600 rounded-[3rem] p-12 text-center text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full -ml-32 -mb-32 blur-3xl animate-pulse" />

                <div className="relative z-10 space-y-6">
                    <h2 className="text-3xl font-bold font-heading">Ready to get started?</h2>
                    <p className="text-indigo-100 text-lg max-w-xl mx-auto font-heading">
                        Your dashboard is ready with all the tools you need to manage references effectively.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Link
                            to="/references"
                            className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                        >
                            Go to References <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/settings"
                            className="px-8 py-3 bg-indigo-500 text-white border border-indigo-400 rounded-xl font-bold hover:bg-indigo-400 transition-all flex items-center gap-2"
                        >
                            Open Settings <SettingsIcon className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="text-center text-gray-400 text-sm pb-8 font-heading">
                © 2026 Council of Scientific & Industrial Research. All rights reserved.
            </div>
        </div>
    );
};

export default HelpPage;
