import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Button from '../../components/ui/Button';
import {
    Plus, Trash2, Copy,
    Sparkles, Search, MoreVertical, LayoutTemplate
} from 'lucide-react';
import { getBlueprints, deleteBlueprint } from '../../services/form.api';
import { useMessageBox } from '../../context/MessageBoxContext';

export default function SavedTemplatesPage() {
    const navigate = useNavigate();
    const { showConfirm } = useMessageBox();

    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");


    useEffect(() => {
        fetchBlueprints();
    }, []);

    const fetchBlueprints = async () => {
        setIsLoading(true);
        try {
            const response = await getBlueprints();
            if (response.success) {
                setTemplates(response.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm({
            title: 'Confirm Delete',
            message: "Are you sure you want to delete this blueprint? This will not affect active forms created from it.",
            type: 'error',
            confirmText: 'Delete Blueprint',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;
        try {
            const response = await deleteBlueprint(id);
            if (response.success) {
                fetchBlueprints();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">

                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter">Form Blueprints</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold tracking-widest opacity-60">REUSABLE TEMPLATE REPOSITORY</p>
                        </div>
                    </div>

                    <Button
                        variant="primary"
                        label="Design New Blueprint"
                        onClick={() => navigate('/data-collection/create')}
                        icon={<Plus className="w-4 h-4" />}
                        className="shadow-lg shadow-indigo-200"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find a blueprint..."
                            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {filteredTemplates.length} Blueprints
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
                        ))}
                    </div>
                ) : filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template) => (
                            <Card key={template._id} className="group hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-xl bg-white overflow-hidden flex flex-col">
                                <CardHeader className="bg-slate-50/50 border-b border-gray-50 p-6">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                                            <LayoutTemplate className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate" title={template.title}>{template.title}</CardTitle>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Fields: {template.fields?.length || 0}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Created: {new Date(template.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {/* Actions Menu */}
                                        <div className="relative group/menu">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                                <MoreVertical className="w-4 h-4 text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 flex flex-col">
                                    <p className="text-gray-500 text-xs line-clamp-3 mb-6 flex-1">{template.description || "No description provided for this blueprint."}</p>

                                    <div className="flex gap-2">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            label="Use This Template"
                                            onClick={() => navigate(`/data-collection/create?useBlueprint=${template._id}`)}
                                            icon={<Copy className="w-3.5 h-3.5" />}
                                            className="w-full text-[11px]"
                                        />
                                        <button
                                            onClick={() => handleDelete(template._id)}
                                            className="flex items-center justify-center p-2 rounded-lg border border-red-50 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 transition-all"
                                            title="Delete Blueprint"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <button
                            onClick={() => navigate('/data-collection/create')}
                            className="bg-white border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8 text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all group min-h-[260px]"
                        >
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                                <Sparkles className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-sm">Design New Blueprint</span>
                            <span className="text-[10px] mt-1 opacity-60">AI-Powered Generation</span>
                        </button>
                    </div>
                ) : (
                    <div className="p-20 text-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Plus className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 font-headline">Create your first blueprint</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mb-8">Blueprints are reusable templates that help you standardize data collection across your organization.</p>
                        <div className="flex justify-center">
                            <Button
                                variant="primary"
                                label="Start Designing"
                                onClick={() => navigate('/data-collection/create')}
                                icon={<Sparkles className="w-4 h-4" />}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
