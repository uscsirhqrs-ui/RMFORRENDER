import { useState, useRef, useEffect, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import {
    Sparkles, Save, Upload, FileText,
    CheckCircle2, Share2, Settings2, Plus,
    X, Download, Image as ImageIcon, Link, ArrowLeft, Eye
} from 'lucide-react';
import { getAllUsers } from '../../services/user.api';
import { createFormTemplate, updateFormTemplate, getFormTemplateById, shareTemplateCopy, getBlueprintById, createBlueprint } from '../../services/form.api';

import { useAuth } from '../../context/AuthContext';
import DropDownWithSearch from '../../components/ui/DropDownWithSearch';
import { Calendar as CalendarIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useMessageBox } from '../../context/MessageBoxContext';

interface FormField {
    id: string;
    type: 'text' | 'select' | 'date' | 'radio' | 'checkbox';
    label: string;
    placeholder?: string;
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
    const { user: currentUser } = useAuth();
    const editId = searchParams.get('edit');
    const useBlueprintId = searchParams.get('useBlueprint');
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

    // Sharing state
    const [selectedSharedLabs, setSelectedSharedLabs] = useState<string[]>([]);
    const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
    const [selectedSharedUsers, setSelectedSharedUsers] = useState<string[]>([]);
    const [sharingMode] = useState<'COLLECT' | 'COPY'>('COLLECT');
    const [sharingDeadline, setSharingDeadline] = useState<string>('');

    // DB Data
    const [availableLabs, setAvailableLabs] = useState<{ label: string; value: string }[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialData();
        if (editId) {
            loadTemplate(editId);
        }
    }, [editId]);

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

    const loadTemplate = async (id: string) => {
        setIsGenerating(true);
        try {
            const res = await getFormTemplateById(id);
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
                setSelectedSharedLabs(template.sharedWithLabs || []);
                setSelectedSharedUsers(template.sharedWithUsers || []);

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

    const fetchInitialData = async () => {
        try {
            const usersRes = await getAllUsers(1, 100);

            if (usersRes.success && usersRes.data) {
                // The API returns a paginated object { users, pagination } or a direct array
                const fetchedUsers = Array.isArray(usersRes.data)
                    ? usersRes.data
                    : (usersRes.data.users || []);

                setAllUsers(fetchedUsers);

                // Derive labs strictly from actual registered users
                const userLabs = Array.from(new Set(fetchedUsers.map((u: any) => u.labName).filter(Boolean))) as string[];
                setAvailableLabs(userLabs.sort().map(lab => ({ label: lab, value: lab })));
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

    const filteredDesignations = useMemo(() => {
        if (selectedSharedLabs.length === 0) return [];
        const filtered = allUsers.filter(u => selectedSharedLabs.includes(u.labName));
        const designations = Array.from(new Set(filtered.map(u => u.designation).filter(Boolean))) as string[];
        return designations.sort();
    }, [allUsers, selectedSharedLabs]);

    const filteredUsers = useMemo(() => {
        const validUsers = allUsers.filter(u =>
            !['admin', 'superadmin', 'delegated admin'].includes(u.role?.toLowerCase()) &&
            u._id !== currentUser?._id // Exclude current user
        );

        if (selectedSharedLabs.length === 0 || selectedDesignations.length === 0) {
            return [];
        }

        return validUsers.filter(u => {
            const labMatch = selectedSharedLabs.includes(u.labName);
            const desigMatch = selectedDesignations.includes(u.designation);
            return labMatch && desigMatch;
        });
    }, [allUsers, selectedSharedLabs, selectedDesignations, currentUser]);

    const generateFromPrompt = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setGeneratedSchema(null);
        setIsRefining(false);

        setTimeout(() => {
            let parsedFields: FormField[] = [];
            let formTitle = "Custom Data Form";

            const numberedListRegex = /((?:\d+[\.)]|\-)\s*[^0-9\.\-]+)/g;
            const listMatches = prompt.match(numberedListRegex);

            if (listMatches && listMatches.length > 0) {
                parsedFields = listMatches.map((matchStr, index) => {
                    const rawText = matchStr.replace(/^(\d+[\.)]|\-)\s*/, '').trim();
                    return parseFieldFromText(rawText, index);
                });
            } else {
                const parts = prompt.split(/,|;|\n/).map(p => p.trim()).filter(p => p.length > 2);
                parsedFields = parts.map((part, index) => parseFieldFromText(part, index));
            }

            if (parsedFields.length === 0 && prompt.length > 2) {
                parsedFields.push(parseFieldFromText(prompt, 0));
            }

            if (parsedFields.length > 0) {
                const firstLabel = parsedFields[0].label;
                formTitle = `Form: ${firstLabel} & more`;
            }
            if (prompt.toLowerCase().includes("feedback")) formTitle = "Feedback Form";
            if (prompt.toLowerCase().includes("inventory")) formTitle = "Inventory Form";
            if (prompt.toLowerCase().includes("registration")) formTitle = "Registration Form";
            if (prompt.toLowerCase().includes("lab")) formTitle = "Lab Data Collection";

            const schema: FormSchema = {
                title: formTitle,
                description: `Generated from prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`,
                fields: parsedFields
            };

            setGeneratedSchema(schema);
            setTemplateName(formTitle);
            setTemplateDescription(schema.description);
            setIsGenerating(false);
            setIsRefining(true);
        }, 800);
    };

    const parseFieldFromText = (text: string, index: number): FormField => {
        const lowerText = text.toLowerCase();
        let type: 'text' | 'select' | 'date' = 'text';
        let options: { label: string; value: string }[] | undefined = undefined;
        let placeholder = "";
        let validation: any = {};

        if (lowerText.includes('date') || lowerText.includes('when') || lowerText.includes('time')) {
            type = 'date';
        } else if (
            lowerText.includes('choose') || lowerText.includes('select') ||
            lowerText.includes('option') || lowerText.includes('dropdown') ||
            lowerText.includes('list') || lowerText.includes('lab')
        ) {
            type = 'select';
            if (lowerText.includes('lab')) {
                options = availableLabs.length > 0 ? availableLabs : [{ label: 'Loading labs...', value: '' }];
            } else {
                const optionsMatch = text.match(/\((.*?)\)/);
                if (optionsMatch) {
                    options = optionsMatch[1].split(',').map(o => ({
                        label: o.trim(),
                        value: o.trim().toLowerCase().replace(/\s+/g, '_')
                    }));
                } else {
                    options = [{ label: 'Option 1', value: '1' }, { label: 'Option 2', value: '2' }];
                }
            }
        }

        if (lowerText.includes('numeric') || lowerText.includes('number') || lowerText.includes('count') || lowerText.includes('strength') || lowerText.includes('mobile') || lowerText.includes('phone') || lowerText.includes('contact')) {
            validation.isNumeric = true;
            placeholder = "Numbers only...";
        } else if (lowerText.includes('email')) {
            validation.isEmail = true;
            placeholder = "e.g., user@example.com";
        }

        let label = text
            .replace(/^\d+[\.)]\s*/, '')
            .replace(/dropdown/gi, '')
            .replace(/select/gi, '')
            .replace(/text box/gi, '')
            .replace(/numeric/gi, '')
            .replace(/number/gi, '')
            .replace(/input/gi, '')
            .replace(/field/gi, '')
            .replace(/requesting/gi, '')
            .replace(/required/gi, '')
            .split(/(-|with|having|options)/i)[0]
            .trim();

        label = label.replace(/[:\-\.]$/, '').trim();
        if (label.length < 2) label = `Field ${index + 1}`;
        label = label.charAt(0).toUpperCase() + label.slice(1);

        return {
            id: `field_${index}_${Math.random().toString(36).substr(2, 5)}`,
            type,
            label,
            placeholder: placeholder || `Enter ${label}`,
            required: !lowerText.includes('optional'),
            options,
            validation
        };
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

    const handleConfirmShare = async () => {
        const finalUserIds = new Set(selectedSharedUsers);
        if (currentUser?._id && finalUserIds.has(currentUser._id)) {
            finalUserIds.delete(currentUser._id);
        }

        if (finalUserIds.size === 0) {
            showMessage({ title: 'Selection Required', message: "No users selected. Please check the users you want to share with.", type: 'warning' });
            return;
        }

        const finalUserList = Array.from(finalUserIds);

        if (sharingMode === 'COLLECT') {
            await handleSaveTemplate(true, [], finalUserList);
        } else {
            if (!selectedTemplateId) {
                // If not saved yet, save first then share
                const saveRes = await handleSaveTemplate(false);
                if (!saveRes) return; // Save failed
            }

            setIsSaving(true);
            try {
                const response = await shareTemplateCopy(selectedTemplateId!, finalUserList, sharingDeadline || undefined);
                setIsSaving(false);
                if (response.success) {
                    setSaveMessage(`Template shared with ${response.data.count} users!`);
                    setTimeout(() => setSaveMessage(null), 3000);
                    setIsSharingModalOpen(false);
                } else {
                    showMessage({ title: 'Share Failed', message: "Failed to share copy: " + response.message, type: 'error' });
                }
            } catch (err) {
                console.error(err);
                setIsSaving(false);
                showMessage({ title: 'Error', message: "An error occurred while sharing.", type: 'error' });
            }
        }
    };

    const handleSaveTemplate = async (isDistribution = false, overrideLabs?: string[], overrideUsers?: string[], asBlueprint = false) => {
        if (!generatedSchema) return false;

        if (!templateName || !templateDescription) {
            showMessage({ title: 'Missing Information', message: "Please provide both a Title and Description for this form before proceeding.", type: 'warning' });
            return false;
        }

        setIsSaving(true);
        const payload = {
            ...generatedSchema,
            title: templateName,
            description: templateDescription,
            sharedWithLabs: overrideLabs ?? selectedSharedLabs,
            sharedWithUsers: overrideUsers ?? selectedSharedUsers,
            allowMultipleSubmissions: allowMultipleSubmissions,
            deadline: sharingDeadline || undefined,
            notifyUsers: isDistribution,
            isActive: true
        };

        try {
            let response;
            if (asBlueprint) {
                response = await createBlueprint(payload);
            } else {
                response = selectedTemplateId
                    ? await updateFormTemplate(selectedTemplateId, payload)
                    : await createFormTemplate(payload);
            }

            setIsSaving(false);
            if (response.success) {
                setSaveMessage(
                    asBlueprint ? "Blueprint saved successfully!" :
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
                    navigate('/data-collection/shared', { state: { activeTab: 'by-me' } });
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex items-center gap-6">
                        {generatedSchema && (
                            <button
                                onClick={() => {
                                    if (editId || useBlueprintId) {
                                        navigate('/data-collection/saved');
                                    } else {
                                        setGeneratedSchema(null);
                                        setPrompt('');
                                    }
                                }}
                                className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all shadow-sm hover:shadow group"
                                title={(editId || useBlueprintId) ? "Back to Templates" : "Back to Generation"}
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter">Design Center</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold tracking-widest opacity-60">DYNAMIC FORM ARCHITECT</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {saveMessage && (
                            <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold animate-in fade-in border border-emerald-100 shadow-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                {saveMessage}
                            </div>
                        )}
                        {generatedSchema && (
                            <>
                                <Button
                                    variant={isRefining ? 'primary' : 'secondary'}
                                    size="sm"
                                    label={isRefining ? "Preview Design" : "Refine Structure"}
                                    onClick={() => setIsRefining(!isRefining)}
                                    icon={<Settings2 className="w-4 h-4" />}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    label="Save as Blueprint"
                                    onClick={() => handleSaveTemplate(false, undefined, undefined, true)}
                                    icon={<Save className="w-4 h-4" />}
                                    disabled={isSaving}
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
                                />
                            </>
                        )}
                    </div>
                </div>

                {!generatedSchema && !isGenerating && !isUploading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* AI Generator */}
                        <Card className="border-indigo-100 shadow-md flex flex-col overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-gray-100">
                                <CardTitle className="flex items-center gap-2 text-indigo-700">
                                    <Sparkles className="w-5 h-5" />
                                    AI Form Generator
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1 flex flex-col gap-4">
                                <textarea
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 transition-all resize-none min-h-[140px] text-sm bg-gray-50/30 font-sans"
                                    placeholder="e.g., Create a form for weekly progress reporting with project name, tasks completed, and challenges."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                />
                                <div className="mt-auto flex justify-end">
                                    <Button
                                        onClick={generateFromPrompt}
                                        loading={isGenerating}
                                        disabled={!prompt.trim()}
                                        icon={<Sparkles className="w-4 h-4" />}
                                        label="Generate Form"
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
                        <CardHeader className={`${isRefining ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'} p-8 transition-colors`}>
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <div className="flex-1">
                                    {isRefining ? (
                                        <div className="space-y-2">
                                            <input
                                                ref={titleInputRef}
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                className="bg-transparent border-b-2 border-white/30 text-3xl font-bold font-headline tracking-tight text-white focus:outline-none focus:border-white w-full"
                                                placeholder="Enter Form Title..."
                                            />
                                            <input
                                                type="text"
                                                value={templateDescription}
                                                onChange={(e) => setTemplateDescription(e.target.value)}
                                                className="bg-transparent border-b border-white/10 text-indigo-100 text-sm focus:outline-none focus:border-white/30 w-full"
                                                placeholder="Add a brief description..."
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h2 className="text-3xl font-bold font-headline tracking-tight text-white">{templateName}</h2>
                                            <p className="text-indigo-100/70 text-sm mt-1">{templateDescription}</p>
                                        </>
                                    )}
                                </div>
                                {isRefining && (
                                    <div className="flex flex-col gap-1 w-48">
                                        <label className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest ml-1">Deadline (Optional)</label>
                                        <input
                                            type="date"
                                            value={sharingDeadline}
                                            onChange={(e) => setSharingDeadline(e.target.value)}
                                            className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/40 transition-all backdrop-blur-sm"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-10 pb-12">
                            {!isRefining && (
                                <div className="max-w-xl mx-auto mb-10 bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-center gap-4 animate-in slide-in-from-top-4 duration-500">
                                    <div className="flex -space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white ring-2 ring-white">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-indigo-900 text-sm font-bold tracking-tight">Interactive Preview Mode</p>
                                        <p className="text-indigo-600/70 text-[10px] uppercase font-bold tracking-widest">Testing input behavior only • Data will not be saved</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="px-2 py-1 bg-white rounded-lg border border-indigo-100 text-[10px] font-bold text-indigo-600 shadow-sm">ACTIVE TEST</span>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl mx-auto">
                                {generatedSchema?.fields.map((field) => (
                                    <div key={field.id} className={`${field.type === 'checkbox' ? 'md:col-span-2' : ''} relative group transition-all`}>
                                        {isRefining && (
                                            <button
                                                onClick={() => handleDeleteField(field.id)}
                                                className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            >
                                                <X className="w-4 h-4" onClick={(e) => e.stopPropagation()} />
                                            </button>
                                        )}

                                        {isRefining ? (
                                            <div className="p-6 rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/10 space-y-4">
                                                <InputField
                                                    label="Field Label"
                                                    value={field.label}
                                                    onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                                                />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Type</label>
                                                        <select
                                                            className="w-full p-2.5 rounded-xl border border-gray-200 text-sm font-sans"
                                                            value={field.type}
                                                            onChange={(e) => handleFieldUpdate(field.id, { type: e.target.value as any })}
                                                        >
                                                            <option value="text">Text Input</option>
                                                            <option value="select">Dropdown</option>
                                                            <option value="date">Date Picker</option>
                                                            <option value="radio">Radio</option>
                                                            <option value="checkbox">Checkbox</option>
                                                        </select>
                                                    </div>
                                                    {field.type === 'text' && (
                                                        <div className="flex items-end pb-2">
                                                            <label className="flex items-center gap-2 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.validation?.isNumeric}
                                                                    onChange={(e) => handleFieldUpdate(field.id, { validation: { ...field.validation, isNumeric: e.target.checked } })}
                                                                    className="w-4 h-4 rounded text-indigo-600"
                                                                />
                                                                <span className="text-xs font-bold text-gray-600">Numbers Only</span>
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {field.type === 'text' && (
                                                    <InputField
                                                        label={field.label}
                                                        placeholder={field.placeholder}
                                                        value={testFormData[field.id] || ''}
                                                        onChange={(e) => setTestFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        required={field.required}
                                                    />
                                                )}

                                                {field.type === 'date' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                                        </label>
                                                        <div className="relative">
                                                            <input
                                                                type="date"
                                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                                                                value={testFormData[field.id] || ''}
                                                                onChange={(e) => setTestFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                            />
                                                            <CalendarIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                                        </div>
                                                    </div>
                                                )}

                                                {field.type === 'select' && (
                                                    <div className="space-y-1">
                                                        <label className="block text-sm font-medium text-gray-700">
                                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                                        </label>
                                                        <DropDownWithSearch
                                                            placeholder={field.placeholder || "Select an option"}
                                                            options={field.options || []}
                                                            selectedValue={testFormData[field.id] || ''}
                                                            onChange={(val) => setTestFormData(prev => ({ ...prev, [field.id]: val }))}
                                                        />
                                                    </div>
                                                )}

                                                {['radio', 'checkbox'].includes(field.type) && (
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                        <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 text-gray-400 text-sm italic">
                                                            {field.type} inputs are currently read-only in preview.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {isRefining && (
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
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Sharing Modal */}
            {isSharingModalOpen && (

                <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-110 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl border-none animate-in zoom-in-95 duration-300 overflow-hidden">
                        <CardHeader className="bg-indigo-600 text-white p-6 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl font-bold font-headline tracking-normal">
                                            {sharingMode === 'COPY' ? 'Share Template Copy' : 'Distribute Form'}
                                        </CardTitle>
                                        <CardDescription className="text-indigo-100 text-xs">
                                            {sharingMode === 'COPY'
                                                ? 'Select users to send them an independent copy of this template.'
                                                : 'Filter by Lab and Designation to target specific users for data collection.'}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-widest ml-1">Optional Deadline</label>
                                        <input
                                            type="date"
                                            value={sharingDeadline}
                                            onChange={(e) => setSharingDeadline(e.target.value)}
                                            className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/40 transition-colors"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsSharingModalOpen(false);
                                            setSharingDeadline('');
                                        }}
                                        className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-2 transition-colors"
                                        aria-label="Close modal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="flex flex-1 divide-x divide-gray-100 overflow-hidden">

                                {/* Column 1: Laboratories */}
                                <div className="w-1/4 flex flex-col bg-white">
                                    <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                                        <label className="text-[10px] font-bold text-gray-400 tracking-wider font-sans uppercase">1. Laboratories</label>
                                        <button
                                            onClick={() => {
                                                const allLabNames = availableLabs.map(l => l.value);
                                                if (selectedSharedLabs.length === allLabNames.length) {
                                                    setSelectedSharedLabs([]);
                                                } else {
                                                    setSelectedSharedLabs(allLabNames);
                                                }
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                                        >
                                            {selectedSharedLabs.length === availableLabs.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                        {availableLabs.map(lab => (
                                            <label key={lab.value} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${selectedSharedLabs.includes(lab.value) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedSharedLabs.includes(lab.value)}
                                                    onChange={() => {
                                                        setSelectedSharedLabs(prev =>
                                                            prev.includes(lab.value) ? prev.filter(l => l !== lab.value) : [...prev, lab.value]
                                                        );
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold leading-none font-sans uppercase">{lab.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Column 2: Designations */}
                                <div className="w-1/4 flex flex-col bg-white">
                                    <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                                        <label className="text-[10px] font-bold text-gray-400 tracking-wider font-sans uppercase">2. Designations</label>
                                        <button
                                            onClick={() => {
                                                const visibleDesignations = filteredDesignations;
                                                const allVisibleSelected = visibleDesignations.length > 0 && visibleDesignations.every(d => selectedDesignations.includes(d));

                                                if (allVisibleSelected) {
                                                    setSelectedDesignations(prev => prev.filter(d => !visibleDesignations.includes(d)));
                                                } else {
                                                    setSelectedDesignations(prev => Array.from(new Set([...prev, ...visibleDesignations])));
                                                }
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                                        >
                                            {(() => {
                                                const visibleDesignations = filteredDesignations;
                                                const allVisibleSelected = visibleDesignations.length > 0 && visibleDesignations.every(d => selectedDesignations.includes(d));
                                                return allVisibleSelected ? 'Deselect All' : 'Select All';
                                            })()}
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                        {filteredDesignations.length === 0 ? (
                                            <div className="p-4 text-xs text-center text-gray-400 italic font-sans">No designations found in selected labs.</div>
                                        ) : (
                                            filteredDesignations.map(desig => (
                                                <label key={desig} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${selectedDesignations.includes(desig) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDesignations.includes(desig)}
                                                        onChange={() => {
                                                            setSelectedDesignations(prev =>
                                                                prev.includes(desig) ? prev.filter(d => d !== desig) : [...prev, desig]
                                                            );
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold leading-none truncate font-sans uppercase" title={desig}>{desig}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Column 3: Users */}
                                <div className="w-2/4 flex flex-col bg-gray-50/30">
                                    <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-400 tracking-wider font-sans uppercase">
                                            3. Users (Filtered)
                                        </label>
                                        <button
                                            onClick={() => {
                                                const displayedUserIds = filteredUsers.map(u => u._id);
                                                if (displayedUserIds.length > 0 && displayedUserIds.every(id => selectedSharedUsers.includes(id))) {
                                                    setSelectedSharedUsers(prev => prev.filter(id => !displayedUserIds.includes(id)));
                                                } else {
                                                    setSelectedSharedUsers(prev => Array.from(new Set([...prev, ...displayedUserIds])));
                                                }
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline uppercase"
                                        >
                                            Select / Deselect Visible
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 custom-scrollbar content-start">
                                        {filteredUsers.length === 0 ? (
                                            <div className="col-span-2 flex flex-col items-center justify-center pt-20 text-gray-400">
                                                <Share2 className="w-8 h-8 opacity-20 mb-2" />
                                                <p className="text-xs italic text-center px-4 font-sans">
                                                    {selectedSharedLabs.length === 0 || selectedDesignations.length === 0
                                                        ? "Select at least one Lab and one Designation to view eligible users."
                                                        : "No users in the selected Lab(s) match the chosen Designation(s)."}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredUsers.map(u => (
                                                <label key={u._id} title={`${u.fullName || "Unnamed"} - ${u.designation} (${u.labName})`} className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group relative ${selectedSharedUsers.includes(u._id) ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSharedUsers.includes(u._id)}
                                                        onChange={() => {
                                                            setSelectedSharedUsers(prev =>
                                                                prev.includes(u._id) ? prev.filter(id => id !== u._id) : [...prev, u._id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                                                    />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-bold text-gray-900 truncate font-sans">
                                                            {u.fullName || "Unnamed User"}
                                                            {u.designation && <span className="text-gray-400 font-normal">, {u.designation}</span>}
                                                        </span>
                                                        <span className="text-[10px] text-indigo-600 font-bold tracking-normal truncate font-sans">({u.labName})</span>
                                                    </div>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-xl">
                                <div className="space-y-4">
                                    <p className="text-[10px] text-gray-400 font-medium font-sans">
                                        {selectedSharedUsers.length} Users selected.
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" checked={allowMultipleSubmissions} onChange={(e) => setAllowMultipleSubmissions(e.target.checked)} />
                                        <div className="text-left font-sans">
                                            <p className="text-sm font-bold text-gray-800">Allow Multiple Submissions</p>
                                            <p className="text-[10px] text-gray-500">Enable repeated entries from the same user</p>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex gap-3">
                                    {sharingMode === 'COLLECT' && (
                                        <Button
                                            label="Copy Link"
                                            variant="secondary"
                                            icon={<Link className="w-4 h-4" />}
                                            onClick={() => {
                                                const link = `${window.location.origin}/data-collection/shared`;
                                                navigator.clipboard.writeText(link);
                                                showMessage({ title: 'Success', message: "Link copied to clipboard: " + link, type: 'success' });
                                            }}
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                        />
                                    )}
                                    <Button
                                        label="Cancel"
                                        variant="secondary"
                                        onClick={() => setIsSharingModalOpen(false)}
                                    />
                                    <Button
                                        label={sharingMode === 'COPY' ? "Share Copy" : "Distribute Form"}
                                        icon={sharingMode === 'COPY' ? <Share2 className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                        onClick={handleConfirmShare}
                                        loading={isSaving}
                                        disabled={isSaving || selectedSharedUsers.length === 0}
                                        className="px-8 shadow-lg shadow-indigo-200"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
            }
        </div >
    );
}
