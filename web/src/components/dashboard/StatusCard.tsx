/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import type StatusInfo from "../../types/StatusInfo";

interface StatusCardProps {
    info: StatusInfo;
    additionalInfo?: string;
    onClick?: () => void;
    isActive?: boolean;
    loading?: boolean;
}

function StatusCard({ info, onClick, isActive, loading, additionalInfo }: StatusCardProps) {

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            className={` p-4 flex rounded-xl shadow-sm flex-col bg-white transition-all duration-300 border-2 ${isActive
                ? 'border-indigo-500 shadow-indigo-100 bg-indigo-50/30 scale-[1.02]'
                : 'border-transparent hover:border-gray-200 hover:bg-gray-50/50'
                }`}
            style={{ cursor: 'pointer' }}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                }
            }}
        >
            <span className="flex justify-between h-10 items-start">
                <h2 className={`text-[12px] font-medium font-heading transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-800'}`}>
                    {info.title}
                </h2>
                {info.icon ? (
                    <div className={`transition-opacity ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {info.icon}
                    </div>
                ) : (
                    <img src={info.iconUrl} alt={`${info.title} icon`} className={`w-5 h-5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-100'}`} />
                )}
            </span>
            <h1 className={`text-xl font-bold font-heading transition-colors ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                {loading ? (
                    <div className="h-7 w-12 bg-gray-200 animate-pulse rounded-md" />
                ) : (
                    info.refcount ?? 0
                )}
            </h1>
            {additionalInfo && (
                <p className="text-sm text-gray-500 mt-1">
                    {additionalInfo}
                </p>
            )}
        </div>
    );
}

export default StatusCard
