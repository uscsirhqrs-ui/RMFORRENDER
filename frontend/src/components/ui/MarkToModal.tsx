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
import { Card, CardContent, CardHeader, CardTitle } from './card';
import Button from './Button';
import { X, Search, User as UserIcon, Send, Loader2 } from 'lucide-react';
import { getAllUsers } from '../../services/user.api';

interface MarkToModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMark: (userId: string, remarks: string) => void;
    title: string;
    loading?: boolean;
    labBound?: boolean;
    mode?: 'delegate' | 'approval';
    chainUsers?: any[];
}

export default function MarkToModal({ isOpen, onClose, onMark, title, loading, labBound = true, mode = 'delegate', chainUsers = [] }: MarkToModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (mode === 'delegate') {
                fetchUsers();
            } else if (mode === 'approval') {
                // Use chainUsers directly
                setUsers(chainUsers || []);
            }
            setSelectedUserId(null);
            setRemarks('');
        }
    }, [isOpen, mode, chainUsers]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await getAllUsers(1, 100, "", labBound);
            if (response.success) {
                setUsers(response.data.users);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    if (!isOpen) return null;

    const filteredUsers = users.filter(u =>
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.labName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300">
                <CardHeader className="bg-linear-to-r from-indigo-600 to-indigo-700 text-white p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <CardTitle className="text-xl font-bold font-headline tracking-tighter flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        {title}
                    </CardTitle>
                    <p className="text-indigo-100 text-xs mt-1 font-medium opacity-80 uppercase tracking-widest">Select user to delegate this form</p>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name, email or lab..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
                            />
                        </div>

                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {isLoadingUsers ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                    <p className="text-sm text-gray-500 font-medium">Fetching users...</p>
                                </div>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <div
                                        key={user._id}
                                        onClick={() => setSelectedUserId(user._id)}
                                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${selectedUserId === user._id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                                            : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedUserId === user._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                                }`}>
                                                <UserIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold transition-colors ${selectedUserId === user._id ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                    {user.fullName}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">
                                                    {user.designation} • {user.labName}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedUserId === user._id && (
                                            <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-sm text-gray-400 font-medium italic">No users found matching your search</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Remarks (Optional)</label>
                            <textarea
                                placeholder="Add instructions for the assignee..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm min-h-[100px] resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="secondary"
                                label="Cancel"
                                onClick={onClose}
                                className="flex-1"
                            />
                            <Button
                                variant="primary"
                                label={loading ? (mode === 'delegate' ? "Delegating..." : "Sending...") : (mode === 'delegate' ? "Confirm Delegation" : "Send for Approval")}
                                onClick={() => selectedUserId && onMark(selectedUserId, remarks)}
                                disabled={!selectedUserId || loading}
                                className="flex-1 shadow-lg shadow-indigo-200"
                                icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
