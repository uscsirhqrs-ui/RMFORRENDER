/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
// @ts-ignore
import axiosInstance from '@shared/api/axiosInstance';

interface DatabaseInfo {
    dbName: string;
    nodeEnv: string;
}

export function DatabaseBanner() {
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

    useEffect(() => {
        const fetchDbInfo = async () => {
            try {
                // Pass _skipAuthRefresh to prevent redirecting/refreshing loop on 401
                // This endpoint should be public but if it fails for any reason (like strict proxy),
                // we don't want to disrupt the login flow.
                const response = await axiosInstance.get('/db-info', {
                    _skipAuthRefresh: true
                });

                if (response.data?.data) {
                    setDbInfo(response.data.data);
                }
            } catch (error: any) {
                // Silent fail for 401s to avoid console noise/user alarm during login
                if (error.response && error.response.status === 401) {
                    // console.debug('Database banner info not available (unauthorized)');
                } else {
                    console.error('Failed to fetch database info:', error);
                }
            }
        };

        fetchDbInfo();
    }, []);

    if (!dbInfo) return null;

    const isTestingDb = dbInfo.dbName.includes('testing');
    const isDevelopment = dbInfo.nodeEnv !== 'production';

    return (
        <div className={`w-full py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold border-b ${isTestingDb
            ? 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30'
            : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30'
            }`}>
            <Database className="w-4 h-4" />
            <span>
                Database: <span className="font-mono">{dbInfo.dbName}</span>
            </span>
            {isDevelopment && (
                <span className="text-xs opacity-75">
                    ({dbInfo.nodeEnv || 'development'})
                </span>
            )}
        </div>
    );
}
