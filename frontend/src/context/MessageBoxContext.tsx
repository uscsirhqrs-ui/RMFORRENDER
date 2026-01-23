import React, { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import MessageBox, { type MessageBoxType } from '../components/ui/MessageBox';

export interface ShowMessageOptions {
    title?: string;
    message: string;
    type?: MessageBoxType;
    confirmText?: string;
    cancelText?: string;
    showCancelButton?: boolean;
    onOk?: () => void;
    onCancel?: () => void;
}

interface MessageBoxContextType {
    showMessage: (options: ShowMessageOptions) => void;
    showConfirm: (options: ShowMessageOptions) => Promise<boolean>;
}

const MessageBoxContext = createContext<MessageBoxContextType | undefined>(undefined);

export const MessageBoxProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<ShowMessageOptions>({ message: '', type: 'info' });
    const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

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



    const handleOk = useCallback(() => {
        if (config.onOk) {
            config.onOk();
        }
        if (resolveRef) {
            resolveRef(true);
        }
        setIsOpen(false);
    }, [config, resolveRef]);

    const handleClose = useCallback(() => {
        if (config.onCancel) {
            config.onCancel();
        }
        // Already handled by closeMessage logic sort of, but let's be explicit
        if (resolveRef) {
            resolveRef(false);
        }
        setIsOpen(false);
    }, [config, resolveRef]);

    return (
        <MessageBoxContext.Provider value={{ showMessage, showConfirm }}>
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
