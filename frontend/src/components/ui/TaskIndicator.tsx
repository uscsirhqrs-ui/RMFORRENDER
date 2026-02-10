/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import axios from 'axios';

interface Task {
    _id: string;
    type: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    progress: number;
    metadata?: {
        templateTitle?: string;
    };
    createdAt: string;
}

export const TaskIndicator = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isOpen, setIsOpen] = useState(false);


    // Ref for click-outside detection
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchTasks = async () => {
        try {
            const response = await axios.get('/api/v1/tasks/my-tasks', { withCredentials: true });
            if (response.data.success) {
                setTasks(response.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch tasks", error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchTasks();

        // Polling interval
        const interval = setInterval(() => {
            // Only poll more frequently if we have active tasks
            const hasActiveTasks = tasks.some(t => ['PENDING', 'IN_PROGRESS'].includes(t.status));
            if (hasActiveTasks || isOpen) {
                fetchTasks();
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, [tasks.length, isOpen]);

    // Click outside handler logic
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const activeTaskCount = tasks.filter(t => ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-all relative ${activeTaskCount > 0 ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title="Background Tasks"
            >
                {activeTaskCount > 0 ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Activity className="w-5 h-5" />
                )}

                {activeTaskCount > 0 && (
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Background Tasks</h3>
                        <button onClick={fetchTasks} className="text-xs text-indigo-600 font-bold hover:underline">Refresh</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {tasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-xs">
                                No active background tasks
                            </div>
                        ) : (
                            tasks.map(task => (
                                <div key={task._id} className="p-4 border-b border-gray-50 last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 line-clamp-1" title={task.metadata?.templateTitle}>
                                                {task.type === 'FORM_DISTRIBUTION' ? 'Distributing Form' : 'Updating Form'}
                                            </p>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {task.metadata?.templateTitle || 'Unknown Template'}
                                            </p>
                                        </div>
                                        {task.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
                                        {task.status === 'FAILED' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                        {task.status === 'IN_PROGRESS' && <span className="text-xs font-bold text-indigo-600">{task.progress}%</span>}
                                    </div>

                                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${task.status === 'COMPLETED' ? 'bg-emerald-500' :
                                                task.status === 'FAILED' ? 'bg-red-500' :
                                                    'bg-indigo-500'
                                                }`}
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <span className="text-[10px] text-gray-400 font-medium uppercase">{task.status.replace('_', ' ')}</span>
                                        <span className="text-[10px] text-gray-300 font-mono">
                                            {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
