/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import React, { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import MessageBox, { type MessageBoxType } from '../components/ui/MessageBox';

export interface ShowMessageOptions {
    title?: string;
    message: React.ReactNode;
    type?: MessageBoxType;
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
    onOk?: (value?: string) => void;
    onCancel?: () => void;
    showInput?: boolean;
    inputPlaceholder?: string;
    inputLabel?: string;
    initialValue?: string;
}

interface MessageBoxContextType {
    showMessage: (options: ShowMessageOptions) => void;
    showConfirm: (options: ShowMessageOptions) => Promise<boolean>;
    showPrompt: (options: ShowMessageOptions) => Promise<string | null>;
}

const MessageBoxContext = createContext<MessageBoxContextType | undefined>(undefined);

export const MessageBoxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<ShowMessageOptions>({ message: '', type: 'info' });
    const [resolveRef, setResolveRef] = useState<((value: any) => void) | null>(null);

    const showMessage = useCallback((options: ShowMessageOptions) => {
        setResolveRef(null); // No promise for simple message
        setConfig({
            ...options,
            showCancelButton: false, // Force false for simple message unless specified otherwise? Actually let's let generic overwrite if passed manually, but default ensure it acts like message
        });
        setIsOpen(true);
    }, []);

    const showConfirm = useCallback((options: ShowMessageOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setResolveRef(() => resolve);
            setConfig({
                ...options,
                showCancelButton: true,
                type: options.type || 'warning', // default to warning/question look
            });
            setIsOpen(true);
        });
    }, []);

    const showPrompt = useCallback((options: ShowMessageOptions): Promise<string | null> => {
        return new Promise((resolve) => {
            setResolveRef(() => resolve);
            setConfig({
                ...options,
                showCancelButton: true,
                type: options.type || 'info',
                showInput: true,
            });
            setIsOpen(true);
        });
    }, []);



    const handleOk = useCallback((inputValue?: string) => {
        if (config.onOk) {
            config.onOk(inputValue);
        }
        if (resolveRef) {
            // If showing input, resolve with value, else true
            if (config.showInput) {
                resolveRef(inputValue || '');
            } else {
                resolveRef(true);
            }
        }
        setIsOpen(false);
    }, [config, resolveRef]);

    const handleClose = useCallback(() => {
        if (config.onCancel) {
            config.onCancel();
        }
        // Already handled by closeMessage logic sort of, but let's be explicit
        if (resolveRef) {
            resolveRef(config.showInput ? null : false);
        }
        setIsOpen(false);
    }, [config, resolveRef]);

    return (
        <MessageBoxContext.Provider value={{ showMessage, showConfirm, showPrompt }}>
            {children}
            {isOpen && (
                <MessageBox
                    isOpen={isOpen}
                    title={config.title}
                    message={config.message}
                    type={config.type}
                    confirmText={config.confirmText}
                    cancelText={config.cancelText}
                    showCancelButton={config.showCancelButton}
                    onClose={handleClose}
                    onOk={handleOk}
                    showInput={config.showInput}
                    inputPlaceholder={config.inputPlaceholder}
                    inputLabel={config.inputLabel}
                    initialValue={config.initialValue}
                />
            )}
        </MessageBoxContext.Provider>
    );
};

export const useMessageBox = (): MessageBoxContextType => {
    const context = useContext(MessageBoxContext);
    if (!context) {
        throw new Error('useMessageBox must be used within a MessageBoxProvider');
    }
    return context;
};
