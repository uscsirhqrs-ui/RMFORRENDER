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
import { useSettings } from '../context/SettingsContext';
import {
    Sun,
    Moon,
    Monitor,
    Palette,
    Type,
    CheckCircle2
} from 'lucide-react';

const themes = [
    { id: 'light', name: 'Light', icon: Sun, description: 'Classic light theme' },
    { id: 'dark', name: 'Dark', icon: Moon, description: 'Easy on the eyes in the dark' },
    { id: 'system', name: 'System', icon: Monitor, description: 'Follows your system settings' },
] as const;

const accentColors = [
    { id: 'indigo', name: 'Indigo', class: 'bg-indigo-600' },
    { id: 'blue', name: 'Blue', class: 'bg-blue-600' },
    { id: 'emerald', name: 'Emerald', class: 'bg-emerald-600' },
    { id: 'rose', name: 'Rose', class: 'bg-rose-600' },
    { id: 'amber', name: 'Amber', class: 'bg-amber-600' },
] as const;

const fontSizes = [
    { id: 'small', name: 'Small', description: 'Tight and compact' },
    { id: 'medium', name: 'Medium', description: 'Standard readability' },
    { id: 'large', name: 'Large', description: 'Big and bold' },
] as const;

const SettingsPage: React.FC = () => {
    const { settings, updateSettings } = useSettings();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-12 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 font-heading dark:text-white">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-heading">Customize your experience and preferences.</p>
            </div>

            {/* Appearance Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-xl font-semibold text-gray-800 font-heading dark:text-white">
                    <Palette className="w-6 h-6 text-indigo-600" />
                    <h2>Appearance</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {themes.map((theme) => {
                        const Icon = theme.icon;
                        const isSelected = settings.theme === theme.id;
                        return (
                            <button
                                key={theme.id}
                                onClick={() => updateSettings({ theme: theme.id })}
                                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group ${isSelected
                                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                                    : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg dark:bg-gray-800 dark:border-gray-700"
                                    }`}
                            >
                                <div className={`p-4 rounded-xl transition-colors ${isSelected ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:bg-gray-700 dark:text-gray-400 dark:group-hover:bg-indigo-900/30"
                                    }`}>
                                    <Icon className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <span className={`block font-bold font-heading text-lg ${isSelected ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                                        {theme.name}
                                    </span>
                                    <p className="text-sm text-gray-500 font-heading dark:text-gray-400">{theme.description}</p>
                                </div>
                                {isSelected && (
                                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Accent Color Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-xl font-semibold text-gray-800 font-heading dark:text-white">
                    <Palette className="w-6 h-6 text-indigo-600" />
                    <h2>Accent Color</h2>
                </div>

                <div className="flex flex-wrap gap-4">
                    {accentColors.map((color) => {
                        const isSelected = settings.accentColor === color.id;
                        return (
                            <button
                                key={color.id}
                                onClick={() => updateSettings({ accentColor: color.id })}
                                className="group relative flex flex-col items-center gap-2 transition-all"
                            >
                                <div className={`w-12 h-12 rounded-full ${color.class} shadow-lg transition-transform group-hover:scale-110 ${isSelected ? "ring-4 ring-offset-2 ring-indigo-600 dark:ring-offset-gray-900" : ""
                                    }`} />
                                <span className={`text-sm font-medium font-heading ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"}`}>
                                    {color.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Typography Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-xl font-semibold text-gray-800 font-heading dark:text-white">
                    <Type className="w-6 h-6 text-indigo-600" />
                    <h2>Typography</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {fontSizes.map((size) => {
                        const isSelected = settings.fontSize === size.id;
                        return (
                            <button
                                key={size.id}
                                onClick={() => updateSettings({ fontSize: size.id })}
                                className={`flex flex-col items-start gap-1 p-6 rounded-2xl border-2 transition-all ${isSelected
                                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                                    : "border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg dark:bg-gray-800 dark:border-gray-700"
                                    }`}
                            >
                                <span className={`block font-bold font-heading text-lg ${isSelected ? "text-indigo-900 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                                    {size.name}
                                </span>
                                <p className="text-sm text-gray-500 font-heading dark:text-gray-400">{size.description}</p>
                                <div className="mt-4 w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full bg-indigo-600 transition-all ${size.id === 'small' ? "w-1/3" : size.id === 'medium' ? "w-2/3" : "w-full"
                                        }`} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Preview Section */}
            <section className="space-y-6 pt-8 border-t border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-800 font-heading text-center dark:text-white">Live Preview</h2>
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="h-6 w-32 bg-indigo-600 rounded-lg animate-pulse" />
                            <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                        </div>
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Palette className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600" />
                        ))}
                    </div>
                    <div className="h-40 rounded-2xl bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center">
                        <span className="text-gray-400 dark:text-gray-500 font-heading">Sample Content Area</span>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SettingsPage;
