/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { updateProfile } from '../services/user.api';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';
type FontSize = 'small' | 'medium' | 'large';

interface Settings {
    theme: Theme;
    accentColor: AccentColor;
    fontSize: FontSize;
}

interface SettingsContextType {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    isDark: boolean;
}

const defaultSettings: Settings = {
    theme: 'light',
    accentColor: 'indigo',
    fontSize: 'medium',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, login } = useAuth();
    const [settings, setSettings] = useState<Settings>(user?.settings || defaultSettings);

    useEffect(() => {
        if (user?.settings) {
            setSettings(user.settings);
        }
    }, [user]);

    const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    useEffect(() => {
        // Apply theme
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Apply font size
        document.documentElement.setAttribute('data-font-size', settings.fontSize);

        // Apply accent color
        // We'll use CSS variables for this
        document.documentElement.setAttribute('data-accent-color', settings.accentColor);
    }, [settings, isDark]);

    const updateSettings = async (newSettings: Partial<Settings>) => {
        const updatedSettings = { ...settings, ...newSettings };
        setSettings(updatedSettings);

        try {
            const response = await updateProfile({ settings: newSettings });
            if (response && response.data) {
                // Update user in AuthContext to persist settings in local storage
                login(response.data);
            }
        } catch (error) {
            console.error('Failed to update settings:', error);
            // Rollback on error
            setSettings(settings);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isDark }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
