/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import {
    Sparkles, Save, Upload, FileText,
    CheckCircle2, Share2, Settings2, Plus,
    X, Download, Image as ImageIcon, ArrowLeft, Eye,
    ShieldAlert, Cpu, RefreshCcw
} from 'lucide-react';
import { createActiveForm, updateActiveForm, getActiveFormById, getBlueprintById, createBlueprint, updateBlueprint } from '../../services/form.api';
import { generateAIForm, getAIUsage } from '../../services/ai.api';

import { useAuth } from '../../context/AuthContext';
import DropDownWithSearch from '../../components/ui/DropDownWithSearch';
import { Calendar as CalendarIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useMessageBox } from '../../context/MessageBoxContext';
import DistributeFormModal from '../../components/ui/DistributeFormModal';
import type { DistributionData } from '../../components/ui/DistributeFormModal';

interface FormField {
    id: string;
    type: 'text' | 'select' | 'date' | 'radio' | 'checkbox' | 'file' | 'header';
    label: string;
    placeholder?: string;
    section?: string;
    columnSpan?: number;
    description?: string;
    options?: { label: string; value: string }[];
    required?: boolean;
    validation?: {
        isNumeric?: boolean;
        isEmail?: boolean;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
    };
}

interface FormSchema {
    title: string;
    description: string;
    fields: FormField[];
}

export default function CreateFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showMessage } = useMessageBox();
    const { } = useAuth();
    const editId = searchParams.get('edit');
    const useBlueprintId = searchParams.get('useBlueprint');
    const editBlueprintId = searchParams.get('editBlueprint');
    const directDistribute = searchParams.get('distribute') === 'true';

    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSchema, setGeneratedSchema] = useState<FormSchema | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [testFormData, setTestFormData] = useState<Record<string, any>>({});
    const [aiUsage, setAiUsage] = useState({ count: 0, limit: 10 });
    const [sharingDeadline, setSharingDeadline] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchAIUsage();
        if (editId) {
            loadTemplate(editId);
        } else if (editBlueprintId) {
            loadBlueprintForEditing(editBlueprintId);
        }
    }, [editId, editBlueprintId]);

    const fetchAIUsage = async () => {
        try {
            const res = await getAIUsage();
            if (res.success) {
                setAiUsage(res.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (useBlueprintId) {
            loadBlueprint(useBlueprintId);
        }
    }, [useBlueprintId]);

    const loadBlueprint = async (id: string) => {
        setIsGenerating(true);
        try {
            const res = await getBlueprintById(id);
            if (res.success) {
                const blueprint = res.data;
                setGeneratedSchema({
                    title: blueprint.title,
                    description: blueprint.description,
                    fields: blueprint.fields
                });
                setTemplateName(blueprint.title);
                setTemplateDescription(blueprint.description);
                setSelectedTemplateId(null); // ENSURE NEW ID ON SAVE
                setIsRefining(true);
                setTimeout(() => {
                    if (titleInputRef.current) {
                        titleInputRef.current.focus();
                        titleInputRef.current.select();
                    }
                }, 100);
            }
        } catch (err) {
            console.error(err);
            showMessage({ title: 'Error', message: "Failed to load blueprint.", type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const loadBlueprintForEditing = async (id: string) => {
        setIsGenerating(true);
        try {
            const res = await getBlueprintById(id);
            if (res.success) {
                const blueprint = res.data;
                setGeneratedSchema({
                    title: blueprint.title,
                    description: blueprint.description,
                    fields: blueprint.fields
                });
                setTemplateName(blueprint.title);
                setTemplateDescription(blueprint.description);
                setSelectedTemplateId(blueprint._id);
                setIsRefining(true);
            }
        } catch (err) {
            console.error(err);
            showMessage({ title: 'Error', message: "Failed to load blueprint for editing.", type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const loadTemplate = async (id: string) => {
        setIsGenerating(true);
        try {
            const res = await getActiveFormById(id);
            if (res.success) {
                const template = res.data;
                setGeneratedSchema({
                    title: template.title,
                    description: template.description || '',
                    fields: template.fields
                });
                setTemplateName(template.title);
                setTemplateDescription(template.description || '');
                setSelectedTemplateId(template._id);
                setAllowMultipleSubmissions(template.allowMultipleSubmissions || false);
                setSharingDeadline(template.deadline ? new Date(template.deadline).toISOString().split('T')[0] : '');

                if (directDistribute) {
                    setIsSharingModalOpen(true);
                } else {
                    setIsRefining(true);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const generateFromPrompt = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setGeneratedSchema(null);
        setIsRefining(false);

        try {
            const res = await generateAIForm(prompt);
            if (res.success) {
                const schema = res.data.schema;
                setGeneratedSchema(schema);
                setTemplateName(schema.title);
                setTemplateDescription(schema.description);
                setAiUsage(prev => ({ ...prev, count: res.data.remaining ? 10 - res.data.remaining : prev.count }));
                fetchAIUsage(); // Refresh exact count from server
                setIsRefining(true);
            } else {
                showMessage({
                    title: 'Generation Failed',
                    message: res.message || "Failed to generate form schema.",
                    type: 'error'
                });
            }
        } catch (err) {
            console.error(err);
            showMessage({
                title: 'Error',
                message: "A network error occurred during form generation.",
                type: 'error'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleFileUpload = (file: File) => {
        setIsUploading(true);
        setGeneratedSchema(null);

        if (file.size > 100 * 1024) {
            showMessage({ title: 'Upload Failed', message: 'File size exceeds 100KB limit.', type: 'error' });
            setIsUploading(false);
            return;
        }

        if (file.name.toLowerCase().endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                preview: 1,
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    if (headers.length === 0) {
                        showMessage({ title: 'Empty CSV', message: 'CSV file appears to be empty.', type: 'error' });
                        setIsUploading(false);
                        return;
                    }
                    const fields: FormField[] = headers.map((header, index) => ({
                        id: `field_${index}`,
                        type: 'text',
                        label: header.trim(),
                        required: false,
                        placeholder: `Enter ${header}`
                    }));

                    setGeneratedSchema({
                        title: "CSV Imported Form",
                        description: `Form generated from ${file.name}.`,
                        fields
                    });
                    setTemplateName("CSV Imported Form");
                    setTemplateDescription(`Form generated from ${file.name}.`);
                    setIsUploading(false);
                    setIsRefining(true);
                }
            });
        }
    };

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        setGeneratedSchema(null);
        try {
            const result = await Tesseract.recognize(file, 'eng');
            const lines = (result.data as any).lines || (result.data.text?.split('\n').map((t: string) => ({ text: t })) || []);
            const extractedFields: FormField[] = [];
            const seenLabels = new Set();

            lines.forEach((line: any, index: number) => {
                let cleanText = line.text?.trim()?.replace(/:$/, "") || "";
                if (cleanText.length > 2 && cleanText.length < 60 && !seenLabels.has(cleanText)) {
                    extractedFields.push({
                        id: `vis_field_${index}`,
                        type: 'text',
                        label: cleanText,
                        required: false,
                        placeholder: `Enter ${cleanText}...`,
                    });
                    seenLabels.add(cleanText);
                }
            });

            if (extractedFields.length === 0) {
                showMessage({ title: 'No Fields', message: "No fields identified.", type: 'warning' });
            } else {
                setGeneratedSchema({
                    title: "Vision-Extracted Form",
                    description: `Extracted from ${file.name}.`,
                    fields: extractedFields.slice(0, 20)
                });
                setTemplateName("Vision-Extracted Form");
                setTemplateDescription(`Extracted from ${file.name}.`);
                setIsRefining(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFieldUpdate = (id: string, updates: Partial<FormField>) => {
        if (!generatedSchema) return;
        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.map(f => f.id === id ? { ...f, ...updates } : f)
        });
    };

    const handleAddField = () => {
        if (!generatedSchema) return;
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type: 'text',
            label: 'New Field',
            placeholder: 'Enter text here',
            required: false
        };
        setGeneratedSchema({
            ...generatedSchema,
            fields: [...generatedSchema.fields, newField]
        });
    };

    const handleDeleteField = (id: string) => {
        if (!generatedSchema) return;
        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.filter(f => f.id !== id)
        });
    };

    const handleAddOption = (fieldId: string) => {
        if (!generatedSchema) return;
        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.map(f => {
                if (f.id === fieldId) {
                    const options = [...(f.options || [])];
                    options.push({ label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` });
                    return { ...f, options };
                }
                return f;
            })
        });
    };

    const handleRemoveOption = (fieldId: string, index: number) => {
        if (!generatedSchema) return;
        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.map(f => {
                if (f.id === fieldId && f.options) {
                    const options = f.options.filter((_, i) => i !== index);
                    return { ...f, options };
                }
                return f;
            })
        });
    };

    const handleUpdateOption = (fieldId: string, index: number, updates: Partial<{ label: string; value: string }>) => {
        if (!generatedSchema) return;
        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.map(f => {
                if (f.id === fieldId && f.options) {
                    const options = f.options.map((opt, i) => i === index ? { ...opt, ...updates } : opt);
                    return { ...f, options };
                }
                return f;
            })
        });
    };

    // Override handleSaveTemplate to support updating blueprint AND distribution options
    const handleSaveTemplate = async (
        isDistribution = false,
        overrideLabs?: string[],
        overrideUsers?: string[],
        asBlueprint = false,
        distributionOptions?: Partial<DistributionData>
    ) => {
        if (!generatedSchema) return false;

        if (!templateName || !templateDescription) {
            showMessage({ title: 'Missing Information', message: "Please provide both a Title and Description for this form before proceeding.", type: 'warning' });
            return false;
        }

        setIsSaving(true);
        const sanitizedFields = generatedSchema.fields.map(f => ({
            ...f,
            type: f.type ? f.type.toLowerCase() as any : 'text',
        }));

        const payload = {
            ...generatedSchema,
            fields: sanitizedFields,
            title: templateName,
            description: templateDescription,
            sharedWithLabs: overrideLabs ?? [],
            sharedWithUsers: overrideUsers ?? [],
            allowMultipleSubmissions: distributionOptions?.allowMultipleSubmissions ?? allowMultipleSubmissions,
            deadline: (distributionOptions?.deadline ?? sharingDeadline) || undefined,
            allowDelegation: distributionOptions?.allowDelegation ?? true, // Default to true if not specified
            notifyUsers: isDistribution,
            isActive: true,
            fillingInstructions: distributionOptions?.fillingInstructions
        };

        try {
            let response;
            if (asBlueprint) {
                if (editBlueprintId) {
                    // Update existing blueprint
                    response = await updateBlueprint(editBlueprintId, payload);
                } else {
                    // Create new blueprint
                    response = await createBlueprint(payload);
                }
            } else {
                response = selectedTemplateId
                    ? await updateActiveForm(selectedTemplateId, payload)
                    : await createActiveForm(payload);
            }

            setIsSaving(false);
            if (response.success) {
                setSaveMessage(
                    asBlueprint ? (editBlueprintId ? "Blueprint updated successfully!" : "Blueprint saved successfully!") :
                        isDistribution ? "Form distributed successfully!" : "Template saved successfully!"
                );
                setTimeout(() => setSaveMessage(null), 3000);

                if (asBlueprint) {
                    navigate('/data-collection/saved');
                    return true;
                }

                if (!selectedTemplateId && response.data?._id) {
                    setSelectedTemplateId(response.data._id);
                }
                if (!isDistribution) {
                    setIsRefining(false);
                } else {
                    setIsSharingModalOpen(false);
                    navigate('/data-collection/distributed-by-me', { state: { activeTab: 'by-me' } });
                }
                return true;
            } else {
                showMessage({ title: 'Save Failed', message: "Failed to save: " + response.message, type: 'error' });
                return false;
            }
        } catch (err) {
            console.error(err);
            setIsSaving(false);
            showMessage({ title: 'Error', message: "An error occurred while saving.", type: 'error' });
            return false;
        }
    };

    const handleDistribute = async (data: DistributionData) => {
        // Pass the data to handleSaveTemplate
        await handleSaveTemplate(true, [], data.targetUserIds, false, {
            allowDelegation: data.allowDelegation,
            allowMultipleSubmissions: data.allowMultipleSubmissions,
            deadline: data.deadline,
            fillingInstructions: data.fillingInstructions
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-4 mb-4 sm:mb-8">
                    <div className="flex items-center gap-3 sm:gap-6">
                        {generatedSchema && (
                            <button
                                onClick={() => {
                                    if (editId || useBlueprintId || editBlueprintId) {
                                        navigate('/data-collection/saved');
                                    } else {
                                        setGeneratedSchema(null);
                                        setPrompt('');
                                    }
                                }}
                                className="p-2 sm:p-3 bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow group shrink-0"
                                title={(editId || useBlueprintId || editBlueprintId) ? "Back to Templates" : "Back to Generation"}
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight truncate">Design Center</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold tracking-widest opacity-60 uppercase">DYNAMIC FORM ARCHITECT</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 lg:justify-end w-full lg:w-auto">
                        {saveMessage && (
                            <div className="w-full lg:w-auto px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold border border-emerald-100 shadow-sm flex items-center gap-2 mb-1 lg:mb-0">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span className="truncate">{saveMessage}</span>
                            </div>
                        )}
                        {generatedSchema && (
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                                <Button
                                    variant={isRefining ? 'primary' : 'secondary'}
                                    size="sm"
                                    label={isRefining ? "Preview Design" : "Refine Structure"}
                                    onClick={() => setIsRefining(!isRefining)}
                                    icon={<Settings2 className="w-4 h-4" />}
                                    className="w-full sm:w-auto"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    label={editBlueprintId ? "Update Blueprint" : "Save as Blueprint"}
                                    onClick={() => handleSaveTemplate(false, undefined, undefined, true)}
                                    icon={<Save className="w-4 h-4" />}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    label="Distribute"
                                    onClick={() => {
                                        if (!templateName || !templateDescription) {
                                            showMessage({ title: 'Missing Information', message: "Please provide both a Title and Description before distributing.", type: 'warning' });
                                            return;
                                        }
                                        setIsSharingModalOpen(true);
                                    }}
                                    icon={<Share2 className="w-4 h-4" />}
                                    disabled={isRefining}
                                    className="w-full sm:w-auto"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {!generatedSchema && !isGenerating && !isUploading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* AI Generator */}
                        <Card className="border-indigo-100 shadow-md flex flex-col overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                                        <Sparkles className="w-5 h-5" />
                                        AI Form Generator
                                    </CardTitle>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-100">
                                        <Cpu className="w-3 h-3 text-indigo-600" />
                                        <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">{Math.max(0, aiUsage.limit - aiUsage.count)} left today</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
                                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Privacy Advisory</p>
                                        <p className="text-[10px] text-amber-700 leading-tight">Data is processed by AI. Avoid typing classified or secret field names in your prompt.</p>
                                    </div>
                                </div>

                                <textarea
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all resize-none min-h-[120px] text-sm bg-gray-50/30 font-sans"
                                    placeholder="e.g., Create an HR form to collect data from new joining for onboarding in CSIR"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <div className="mt-auto flex justify-end">
                                    <Button
                                        onClick={generateFromPrompt}
                                        loading={isGenerating}
                                        disabled={!prompt.trim() || aiUsage.count >= aiUsage.limit}
                                        icon={<Sparkles className="w-4 h-4" />}
                                        label={aiUsage.count >= aiUsage.limit ? "Limit Reached" : "Generate Form"}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* CSV Upload */}
                        <Card className="border-indigo-100 shadow-md flex flex-col overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-gray-100">
                                <CardTitle className="flex items-center gap-2 text-purple-700">
                                    <Upload className="w-5 h-5" />
                                    CSV Template
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
                                <div
                                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer p-8 group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
                                    <Upload className="w-8 h-8 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm font-bold text-gray-900">Upload CSV</p>
                                    <p className="text-xs text-gray-500">Extract fields from headers</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    icon={<Download className="w-4 h-4" />}
                                    label="Download CSV Template"
                                    onClick={() => {
                                        const csv = "Field1,Field2,Field3\nValue1,Value2,Value3";
                                        const blob = new Blob([csv], { type: 'text/csv' });
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'template.csv';
                                        a.click();
                                    }}
                                />
                            </CardContent>
                        </Card>

                        {/* Image Analysis */}
                        <Card className="border-indigo-100 shadow-md flex flex-col overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-gray-100">
                                <CardTitle className="flex items-center gap-2 text-orange-700">
                                    <ImageIcon className="w-5 h-5" />
                                    AI Vision Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
                                <div
                                    className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer p-8 group"
                                    onClick={() => imageInputRef.current?.click()}
                                >
                                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                    <ImageIcon className="w-8 h-8 text-orange-600 mb-4 group-hover:scale-110 transition-transform" />
                                    <p className="text-sm font-bold text-gray-900">Analyze Form Image</p>
                                    <p className="text-xs text-gray-500">Extract fields using AI OCR</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (isGenerating || isUploading) ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-gray-900 font-headline tracking-tight mb-2 italic">
                            {isUploading ? "Analyzing Vision Patterns..." : "Generating intelligent schema..."}
                        </h2>
                        <p className="text-gray-500">Please wait while our AI architect works...</p>
                    </div>
                ) : (
                    <Card className={`shadow-xl border-none overflow-hidden transition-all duration-500 bg-white ${isRefining ? 'ring-2 ring-indigo-500' : ''}`}>
                        <CardHeader className={`${isRefining ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'} p-4 sm:p-8 transition-colors`}>
                            <div className="flex flex-col md:flex-row items-center md:items-center gap-4 sm:gap-6 text-center md:text-left">
                                <div className="hidden md:flex w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md items-center justify-center border border-white/20 shrink-0">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div className="flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left">
                                    {isRefining ? (
                                        <div className="space-y-2 w-full">
                                            <div className="flex items-center justify-center md:justify-start gap-4 md:hidden mb-2">
                                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Editing Template</span>
                                            </div>
                                            <input
                                                ref={titleInputRef}
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                className="bg-transparent border-b-2 border-white/30 text-xl sm:text-3xl font-bold font-headline tracking-tight text-white focus:outline-none focus:border-white w-full py-1 text-center md:text-left"
                                                placeholder="Enter Form Title..."
                                            />
                                            <input
                                                type="text"
                                                value={templateDescription}
                                                onChange={(e) => setTemplateDescription(e.target.value)}
                                                className="bg-transparent border-b border-white/10 text-indigo-100 text-xs sm:text-sm focus:outline-none focus:border-white/30 w-full py-1 text-center md:text-left"
                                                placeholder="Add a brief description..."
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center md:items-start">
                                            <h2 className="text-xl sm:text-3xl font-bold font-headline tracking-tight text-white">{templateName}</h2>
                                            <p className="text-indigo-100/70 text-xs sm:text-sm mt-1">{templateDescription}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-10 pb-12">
                            {/* AI Iteration Center - Refinement Bar */}
                            <div className="max-w-5xl mx-auto mb-10 group px-2 sm:px-0">
                                <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100/50 flex flex-col sm:flex-row items-center gap-4 transition-all hover:bg-indigo-50/60 shadow-sm border-dashed">
                                    <div className="flex-1 w-full relative">
                                        <textarea
                                            className="w-full p-3 pr-12 rounded-xl border border-indigo-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all outline-none text-sm bg-white/80 resize-none h-[60px] sm:h-[44px] leading-tight font-sans"
                                            placeholder="Refine your form (e.g., 'Add a GST field', 'Group all personal fields')..."
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                        <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300 pointer-events-none" />
                                    </div>
                                    <Button
                                        size="sm"
                                        label="Regenerate with AI"
                                        onClick={generateFromPrompt}
                                        loading={isGenerating}
                                        disabled={!prompt.trim() || aiUsage.count >= aiUsage.limit}
                                        icon={<RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />}
                                        className="shrink-0 w-full sm:w-auto"
                                    />
                                </div>
                                <div className="mt-4 sm:mt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6">
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest opacity-60">AI Iteration Center</p>
                                    <div className="hidden sm:block h-px w-20 bg-indigo-100" />
                                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest opacity-60">
                                        {Math.max(0, aiUsage.limit - aiUsage.count)} Generations Remaining
                                    </p>
                                </div>
                            </div>

                            {!isRefining && (
                                <div className="max-w-xl mx-auto mb-12 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-sm">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white ring-2 ring-white shadow-sm">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-indigo-900 text-sm font-bold tracking-tight">Interactive Preview Mode</p>
                                        <p className="text-indigo-600/70 text-[10px] uppercase font-bold tracking-widest leading-none mt-1">Testing input behavior only • Data will not be saved</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="px-2 py-1 bg-white rounded-lg border border-indigo-100 text-[10px] font-bold text-indigo-600 shadow-sm">ACTIVE TEST</span>
                                    </div>
                                </div>
                            )}

                            {isRefining ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl mx-auto">
                                    {generatedSchema?.fields.map((field) => (
                                        <div key={field.id} className={`${field.columnSpan === 2 || field.type === 'header' ? 'md:col-span-2' : ''} relative group transition-all`}>
                                            <button
                                                onClick={() => handleDeleteField(field.id)}
                                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>

                                            <div className="p-6 rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/10 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <InputField
                                                        label="Field Label"
                                                        value={field.label}
                                                        onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                                                    />
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">Type</label>
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => handleFieldUpdate(field.id, { type: e.target.value as any })}
                                                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                        >
                                                            <option value="text">Text Input</option>
                                                            <option value="select">Dropdown</option>
                                                            <option value="date">Date Picker</option>
                                                            <option value="checkbox">Checkbox</option>
                                                            <option value="file">File Upload</option>
                                                            <option value="header">Section Header</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <InputField
                                                        label="Section Group"
                                                        value={field.section || ''}
                                                        placeholder="e.g., Personal Details"
                                                        onChange={(e) => handleFieldUpdate(field.id, { section: e.target.value })}
                                                    />
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">Column Width</label>
                                                        <select
                                                            value={field.columnSpan || 1}
                                                            onChange={(e) => handleFieldUpdate(field.id, { columnSpan: parseInt(e.target.value) })}
                                                            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs"
                                                        >
                                                            <option value={1}>1 Column (Half width)</option>
                                                            <option value={2}>2 Columns (Full width)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <InputField
                                                    label="Placeholder Text"
                                                    value={field.placeholder || ''}
                                                    placeholder="Example text to guide the user..."
                                                    onChange={(e) => handleFieldUpdate(field.id, { placeholder: e.target.value })}
                                                />

                                                {/* Advanced Controls: Validation & Options */}
                                                <div className="pt-2 flex flex-col gap-4 border-t border-indigo-100/50">
                                                    <div className="flex items-center gap-6">
                                                        <label className="flex items-center gap-2 cursor-pointer group/label">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.required}
                                                                onChange={(e) => handleFieldUpdate(field.id, { required: e.target.checked })}
                                                                className="w-4 h-4 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover/label:text-indigo-600 transition-colors">Required Field</span>
                                                        </label>

                                                        {field.type === 'text' && (
                                                            <>
                                                                <label className="flex items-center gap-2 cursor-pointer group/label">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.validation?.isNumeric}
                                                                        onChange={(e) => handleFieldUpdate(field.id, {
                                                                            validation: { ...field.validation, isNumeric: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover/label:text-indigo-600 transition-colors">Numbers Only</span>
                                                                </label>
                                                                <label className="flex items-center gap-2 cursor-pointer group/label">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.validation?.isEmail}
                                                                        onChange={(e) => handleFieldUpdate(field.id, {
                                                                            validation: { ...field.validation, isEmail: e.target.checked }
                                                                        })}
                                                                        className="w-4 h-4 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider group-hover/label:text-indigo-600 transition-colors">Email Format</span>
                                                                </label>
                                                            </>
                                                        )}
                                                    </div>

                                                    {['select', 'radio', 'checkbox'].includes(field.type) && (
                                                        <div className="space-y-3 bg-white/50 p-4 rounded-xl border border-indigo-50">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Options Management</h5>
                                                                <button
                                                                    onClick={() => handleAddOption(field.id)}
                                                                    className="text-indigo-600 hover:text-indigo-700 font-bold text-[10px] uppercase flex items-center gap-1"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Add Option
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {field.options?.map((opt, idx) => (
                                                                    <div key={idx} className="flex gap-2 group/opt">
                                                                        <input
                                                                            type="text"
                                                                            className="flex-1 px-3 py-1.5 bg-white border border-indigo-100 rounded-lg text-xs outline-none focus:border-indigo-400 transition-all font-medium"
                                                                            value={opt.label}
                                                                            onChange={(e) => handleUpdateOption(field.id, idx, { label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                                                                            placeholder="Option Label"
                                                                        />
                                                                        <button
                                                                            onClick={() => handleRemoveOption(field.id, idx)}
                                                                            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                                {(!field.options || field.options.length === 0) && (
                                                                    <p className="text-[10px] text-amber-500 italic">No options added yet.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="md:col-span-2 flex flex-col gap-6 py-4">
                                        <button
                                            onClick={handleAddField}
                                            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-xs"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Field
                                        </button>
                                        <div className="flex justify-end pt-6 border-t border-indigo-100">
                                            <Button
                                                variant="primary"
                                                size="lg"
                                                label="Finalize Schema"
                                                onClick={() => handleSaveTemplate(false)}
                                                loading={isSaving}
                                                icon={<Save className="w-4 h-4" />}
                                                className="px-12"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-5xl mx-auto space-y-12">
                                    {Object.entries(
                                        generatedSchema?.fields.reduce((acc, field) => {
                                            const section = field.section || "General Information";
                                            if (!acc[section]) acc[section] = [];
                                            acc[section].push(field);
                                            return acc;
                                        }, {} as Record<string, FormField[]>) || {}
                                    ).map(([sectionName, fields]) => (
                                        <div key={sectionName} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                            <div className="flex items-center gap-6">
                                                <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] font-headline">{sectionName}</h3>
                                                <div className="h-px flex-1 bg-linear-to-r from-transparent via-slate-200 to-transparent" />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
                                                {fields.map((field) => (
                                                    <div
                                                        key={field.id}
                                                        className={`${field.columnSpan === 2 || field.type === 'header' || ['checkbox', 'radio', 'file'].includes(field.type) ? 'md:col-span-2' : ''} space-y-2`}
                                                    >
                                                        {field.type === 'header' ? (
                                                            <div className="py-2 border-b-2 border-indigo-600/10 flex items-center justify-between mb-2">
                                                                <h4 className="text-base font-bold text-slate-800 tracking-tight">{field.label}</h4>
                                                                {field.description && <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded">{field.description}</span>}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {['text', 'date', 'select'].includes(field.type) && (
                                                                    <div className="space-y-1.5">
                                                                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide ml-1">
                                                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                                                        </label>
                                                                        {field.type === 'text' && (
                                                                            <div className="relative">
                                                                                <input
                                                                                    type={field.validation?.isNumeric ? "number" : field.validation?.isEmail ? "email" : "text"}
                                                                                    className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-300 bg-white ${field.validation?.isEmail && testFormData[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testFormData[field.id])
                                                                                        ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                                                                                        }`}
                                                                                    placeholder={field.placeholder || `Enter ${field.label}...`}
                                                                                    value={testFormData[field.id] || ''}
                                                                                    onChange={(e) => setTestFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                                />
                                                                                {field.validation?.isEmail && testFormData[field.id] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testFormData[field.id]) && (
                                                                                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 animate-in fade-in slide-in-from-top-1">Please enter a valid email address</p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'date' && (
                                                                            <div className="relative">
                                                                                <input
                                                                                    type="date"
                                                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm bg-white"
                                                                                    value={testFormData[field.id] || ''}
                                                                                    onChange={(e) => setTestFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                                />
                                                                                <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                                                            </div>
                                                                        )}
                                                                        {field.type === 'select' && (
                                                                            <DropDownWithSearch
                                                                                placeholder={field.placeholder || "Select option..."}
                                                                                options={field.options || []}
                                                                                selectedValue={testFormData[field.id] || ''}
                                                                                onChange={(v) => setTestFormData(prev => ({ ...prev, [field.id]: v }))}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {field.type === 'radio' && (
                                                                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 group hover:border-indigo-200 hover:bg-white transition-all duration-300">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 transition-colors">
                                                                                    <CheckCircle2 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                                                                                </div>
                                                                                <p className="text-sm font-bold text-slate-700 tracking-tight">{field.label}</p>
                                                                            </div>
                                                                            <span className="px-2 py-1 bg-white rounded border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Preview Only</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-11">
                                                                            {field.options?.map((opt, i) => (
                                                                                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-default">
                                                                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 bg-white" />
                                                                                    <span className="text-xs text-slate-600 font-medium">{opt.label}</span>
                                                                                </div>
                                                                            ))}
                                                                            {(!field.options || field.options.length === 0) && (
                                                                                <p className="text-[10px] text-amber-500 italic">No options generated for this radio group.</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {['checkbox', 'file'].includes(field.type) && (
                                                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 hover:bg-white transition-all duration-300">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-indigo-600 transition-colors">
                                                                                {field.type === 'file' ?
                                                                                    <Upload className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" /> :
                                                                                    <CheckCircle2 className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                                                                                }
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-sm font-bold text-slate-700 tracking-tight">{field.label}</p>
                                                                                <p className="text-[10px] text-slate-400 mt-0.5 leading-none">{field.description || `Simulated ${field.type} control`}</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="px-2 py-1 bg-white rounded border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Read Only</span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-10 flex flex-col items-center">
                                        <button className="w-full md:w-auto px-16 py-4 bg-indigo-700 text-white rounded-xl font-bold font-headline shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all hover:-translate-y-1 active:scale-95 text-lg">
                                            Submit Form Data
                                        </button>
                                        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest opacity-50">Authorized Personnel Only • Dynamic CSR Portal</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div >

            {/* Sharing/Distribute Modal */}
            <DistributeFormModal
                isOpen={isSharingModalOpen}
                onClose={() => setIsSharingModalOpen(false)}
                formTitle={templateName}
                onDistribute={handleDistribute}
                isDistributing={isSaving}
            />
        </div >
    );
}
