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
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface DatabaseInfo {
    dbName: string;
    nodeEnv: string;
}

export function DatabaseBanner() {
    const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);

    useEffect(() => {
        const fetchDbInfo = async () => {
            try {
                const response = await axios.get(`${API_URL}/db-info`);
                if (response.data?.data) {
                    setDbInfo(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch database info:', error);
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
