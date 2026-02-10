/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import InputField from '../components/ui/InputField';
import Button from '../components/ui/Button';
import DropDownWithSearch from '../components/ui/DropDownWithSearch';
import { Sparkles, Calendar, Type, Save, Upload, FileText, CheckCircle2, Share2, Settings2, Trash2, Plus, Link, Copy, X, Download, Image as ImageIcon, User, ArrowUpRight, ArrowDownLeft, PlusCircle } from 'lucide-react';
import { getAllUsers } from '../services/user.api';
import { createActiveForm, updateActiveForm, getActiveForms, submitFormData, deleteActiveForm, cloneActiveForm, shareTemplateCopy, getActiveFormById } from '../services/form.api';
import { getSystemConfig } from '../services/systemConfig.api';
import { useAuth } from '../context/AuthContext';
import UserProfileViewModal from '../components/ui/UserProfileViewModal';
import Papa from 'papaparse';
import FormSubmissionsView from '../components/ui/FormSubmissionsView';
import { Eye } from 'lucide-react';
import { useMessageBox } from '../context/MessageBoxContext';
import { FeatureCodes } from '../constants';

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

export default function DataCollectionPage() {
    const { user: currentUser, hasPermission } = useAuth();
    const { showMessage, showConfirm } = useMessageBox();
    const { id } = useParams();
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSchema, setGeneratedSchema] = useState<FormSchema | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isUploading, setIsUploading] = useState(false);
    // UI Logic States
    const [currentStep, setCurrentStep] = useState<'selection' | 'creation' | 'filling'>('selection');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    // Shared Users View State
    const [isSharedUsersViewOpen, setIsSharedUsersViewOpen] = useState(false);
    const [viewingSharedUsersList, setViewingSharedUsersList] = useState<any[]>([]);
    const [viewingSharedTemplateTitle, setViewingSharedTemplateTitle] = useState("");
    const [existingTemplates, setExistingTemplates] = useState<any[]>([]);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSharingModalOpen, setIsSharingModalOpen] = useState(false);
    const [isFillingModalOpen, setIsFillingModalOpen] = useState(false);
    const [isNameModalOpen, setIsNameModalOpen] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
    const [allLabs, setAllLabs] = useState<string[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Sharing state
    const [selectedSharedLabs, setSelectedSharedLabs] = useState<string[]>([]);
    const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
    const [selectedSharedUsers, setSelectedSharedUsers] = useState<string[]>([]);

    // DB Data for pre-filling
    const [availableLabs, setAvailableLabs] = useState<{ label: string; value: string }[]>([]);

    // State for options being edited (to allow commas)
    const [editingOptions, setEditingOptions] = useState<Record<string, string>>({});

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedProfileUserId, _setSelectedProfileUserId] = useState<string | null>(null);

    // Submissions View State
    const [viewingSubmissionsTemplate, setViewingSubmissionsTemplate] = useState<any | null>(null);

    // Valid sharing modes
    const [sharingMode, setSharingMode] = useState<'COLLECT' | 'COPY'>('COLLECT');
    const [sharingDeadline, setSharingDeadline] = useState<string>('');

    // File upload refs and state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchInitialData();
        if (id) {
            handleLoadSpecificTemplate(id);
        }
    }, [id]);

    const handleLoadSpecificTemplate = async (templateId: string) => {
        try {
            setIsSaving(true); // Re-using isSaving as a generic loader state here
            const response = await getActiveFormById(templateId);
            setIsSaving(false);
            if (response.success && response.data) {
                const template = response.data;
                setGeneratedSchema({
                    title: template.title,
                    description: template.description,
                    fields: template.fields
                });
                setTemplateName(template.title);
                setSelectedTemplateId(template._id);
                setIsFillingModalOpen(true);
            } else {
                showMessage({ title: 'Error', message: "Error fetching form details: " + response.message, type: 'error' });
            }
        } catch (error) {
            console.error("Error loading specific template:", error);
            setIsSaving(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            const [usersRes, templatesRes, configRes] = await Promise.all([
                getAllUsers(1, 1000), // Get a substantial number of users for distribution selection
                getActiveForms(),
                getSystemConfig()
            ]);

            // Default fallback labs (CSIR)
            let consolidatedLabs: string[] = ["CDRI", "IITR", "NBRI", "CIMAP", "NGRI", "CCMB", "IICT", "NCL", "CECRI", "CFTRI"];

            // 1. Try from SystemConfig (Overrides defaults if present)
            if (configRes.success && configRes.data) {
                // Try multiple common keys
                const configLabs = configRes.data.ALLOWED_LABS || configRes.data.LABS || configRes.data.labNames;
                if (Array.isArray(configLabs) && configLabs.length > 0) {
                    consolidatedLabs = [...configLabs];
                }
            }

            // 2. Supplement from Users
            if (usersRes.success && usersRes.data) {
                const fetchedUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []);
                setAllUsers(fetchedUsers);
                const userLabs = Array.from(new Set(fetchedUsers.map((u: any) => u.labName).filter(Boolean))) as string[];

                if (userLabs.length > 0) {
                    // Combine with unique labs from config/defaults
                    consolidatedLabs = Array.from(new Set([...consolidatedLabs, ...userLabs]));
                }
            }

            if (consolidatedLabs.length > 0) {
                const updatedLabs = consolidatedLabs.map(lab => ({ label: lab, value: lab }));
                setAllLabs(consolidatedLabs);
                setAvailableLabs(updatedLabs);
            }

            if (templatesRes.success && templatesRes.data) {
                setExistingTemplates(templatesRes.data);
            }
        } catch (error) {
            console.error("Error fetching initial data:", error);
            // Fallback for safety even on total failure
            setAvailableLabs(["CDRI", "IITR", "NBRI"].map(l => ({ label: l, value: l })));
        }
    };

    // Reactive Lab Syncing
    useEffect(() => {
        if (availableLabs.length > 0 && generatedSchema) {
            const hasLoading = generatedSchema.fields.some(f => f.type === 'select' && f.options?.[0]?.label === 'Loading labs...');
            if (hasLoading) {
                setGeneratedSchema({
                    ...generatedSchema,
                    fields: generatedSchema.fields.map(f => {
                        if (f.type === 'select' && f.options?.[0]?.label === 'Loading labs...') {
                            return { ...f, options: availableLabs };
                        }
                        return f;
                    })
                });
            }
        }
    }, [availableLabs, generatedSchema]);

    const generateFromPrompt = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setGeneratedSchema(null);
        setFormData({});
        setIsRefining(false);

        // Local Regex-based Parser to handle dynamic prompts
        setTimeout(() => {
            let parsedFields: FormField[] = [];
            let formTitle = "Custom Data Form";

            // 1. Try to split by numbered lists (e.g., "1. Name 2. Age" or "1. Name")
            const numberedListRegex = /((?:\d+[\.)]|\-)\s*[^0-9\.\-]+)/g;
            const listMatches = prompt.match(numberedListRegex);

            if (listMatches && listMatches.length > 0) {
                // Strategy A: Numbered List Detected
                parsedFields = listMatches.map((matchStr, index) => {
                    // Remove the number leader (e.g. "1. ")
                    const rawText = matchStr.replace(/^(\d+[\.)]|\-)\s*/, '').trim();
                    return parseFieldFromText(rawText, index);
                });
            } else {
                // Strategy B: Comma/New-line separation if no numbers found
                const parts = prompt.split(/,|;|\n/).map(p => p.trim()).filter(p => p.length > 2);
                parsedFields = parts.map((part, index) => parseFieldFromText(part, index));
            }

            // Fallback if no fields detected
            if (parsedFields.length === 0 && prompt.length > 2) {
                parsedFields.push(parseFieldFromText(prompt, 0));
            }

            // Generate Title
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
            setIsGenerating(false);
        }, 800);
    };

    // Helper to parse individual field text
    const parseFieldFromText = (text: string, index: number): FormField => {
        const lowerText = text.toLowerCase();
        let type: 'text' | 'select' | 'date' = 'text';
        let options: { label: string; value: string }[] | undefined = undefined;
        let placeholder = "";
        let validation: any = {};

        // Detect Type
        if (lowerText.includes('date') || lowerText.includes('when') || lowerText.includes('time')) {
            type = 'date';
        } else if (
            lowerText.includes('choose') ||
            lowerText.includes('select') ||
            lowerText.includes('option') ||
            lowerText.includes('dropdown') ||
            lowerText.includes('list') ||
            lowerText.includes('lab')
        ) {
            type = 'select';

            // Special Case: Lab names from DB
            if (lowerText.includes('lab')) {
                options = availableLabs.length > 0 ? availableLabs : [
                    { label: 'Loading labs...', value: '' }
                ];
            } else {
                // Extract options if present: "Select color (red, blue, green)"
                const optionsMatch = text.match(/\((.*?)\)/);
                if (optionsMatch) {
                    options = optionsMatch[1].split(',').map(o => ({
                        label: o.trim(),
                        value: o.trim().toLowerCase().replace(/\s+/g, '_')
                    }));
                } else {
                    options = [
                        { label: 'Option 1', value: '1' },
                        { label: 'Option 2', value: '2' }
                    ];
                }
            }
        }

        // Smart Validation Detection
        // Smart Validation Detection
        if (lowerText.includes('numeric') || lowerText.includes('number') || lowerText.includes('count') || lowerText.includes('strength') || lowerText.includes('mobile') || lowerText.includes('phone') || lowerText.includes('contact')) {
            validation.isNumeric = true;
            placeholder = "Numbers only...";
        } else if (lowerText.includes('email')) {
            validation.isEmail = true;
            placeholder = "e.g., user@example.com";
        }

        // Clean Label
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
        if (file) {
            handleFileUpload(file);
        }
    };

    const handleFileUpload = (file: File) => {
        setIsUploading(true);
        setGeneratedSchema(null);
        setFormData({});
        setIsRefining(false);

        // Check file size (100KB limit)
        if (file.size > 100 * 1024) {
            showMessage({ title: 'Upload Failed', message: 'File size exceeds 100KB limit. Please upload a smaller CSV file.', type: 'error' });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.csv')) {
            // Parse CSV file to extract column names
            Papa.parse(file, {
                header: true,
                preview: 1, // Only read first row to get headers
                complete: (results) => {
                    const headers = results.meta.fields || [];

                    if (headers.length === 0) {
                        showMessage({ title: 'Empty CSV', message: 'CSV file appears to be empty or has no headers.', type: 'error' });
                        setIsUploading(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    // Create form fields from CSV column names
                    const fields: FormField[] = headers.map((header, index) => ({
                        id: `field_${index}`,
                        type: 'text',
                        label: header.trim(), // Use actual column name from CSV
                        required: false,
                        placeholder: `Enter ${header}`
                    }));

                    setGeneratedSchema({
                        title: "CSV Imported Form",
                        description: `Form generated from ${file.name}. Contains ${headers.length} field(s).`,
                        fields
                    });

                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                },
                error: (error) => {
                    console.error('CSV parsing error:', error);
                    showMessage({ title: 'Parsing Error', message: 'Error parsing CSV file: ' + error.message, type: 'error' });
                    setIsUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            });
        } else {
            showMessage({ title: 'Invalid Format', message: 'Unsupported file format. Please upload a CSV file (.csv)', type: 'error' });
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        setGeneratedSchema(null);
        setFormData({});
        setIsRefining(false);

        try {
            // Use Tesseract to perform OCR on the image
            const result = await Tesseract.recognize(file, 'eng');

            if (!result || !result.data) {
                throw new Error("OCR engine failed to return valid data.");
            }

            const { data } = result;
            const lines = (data as any).lines || [];

            // Heuristic to identify form fields from OCR lines
            const extractedFields: FormField[] = [];
            const seenLabels = new Set();

            // Fallback: if lines is empty but text is present, split text by newlines
            const processingLines = lines.length > 0 ? lines : (data.text?.split('\n').map(t => ({ text: t })) || []);

            processingLines.forEach((line: any, index: number) => {
                let cleanText = line.text?.trim() || "";
                if (!cleanText) return;

                // Typical form labels end with colons or are on their own lines
                // We'll strip colons for cleaner labels
                cleanText = cleanText.replace(/:$/, "").trim();

                // Validation/Filtering:
                // 1. Minimum length Check
                // 2. Maximum length check (unlikely to be a label if too long)
                // 3. Duplicate check
                if (cleanText.length > 2 && cleanText.length < 60 && !seenLabels.has(cleanText)) {
                    const lowerText = cleanText.toLowerCase();

                    // Filter out non-labels (headers, common document text)
                    const noiseKeywords = ["form", "confidential", "page", "section", "document", "official", "internal"];
                    if (noiseKeywords.some(k => lowerText.includes(k) && cleanText.split(' ').length > 3)) return;

                    let type: 'text' | 'select' | 'radio' | 'checkbox' | 'date' = 'text';
                    let options = undefined;
                    let validation = undefined;

                    // Intelligent field type guessing
                    if (lowerText.includes("date") || lowerText.includes("dob") || lowerText.includes("birth") || lowerText.includes("year")) {
                        type = 'date';
                    } else if (lowerText.includes("email") || lowerText.includes("mail")) {
                        validation = { isEmail: true };
                    } else if (lowerText.includes("phone") || lowerText.includes("mobile") || lowerText.includes("contact")) {
                        validation = { isNumeric: true, minLength: 10, maxLength: 10 };
                    } else if (lowerText.includes("gender") || lowerText.includes("sex")) {
                        type = 'select';
                        options = [
                            { label: 'Male', value: 'male' },
                            { label: 'Female', value: 'female' },
                            { label: 'Other', value: 'other' }
                        ];
                    } else if (lowerText.includes("department") || lowerText.includes("lab") || lowerText.includes("category")) {
                        type = 'select';
                        options = [
                            { label: 'Default Option 1', value: 'opt1' },
                            { label: 'Default Option 2', value: 'opt2' }
                        ];
                    }

                    extractedFields.push({
                        id: `vis_field_${index}`,
                        type,
                        label: cleanText,
                        required: false,
                        placeholder: `Enter ${cleanText}...`,
                        options,
                        validation
                    });

                    seenLabels.add(cleanText);
                }
            });

            if (extractedFields.length === 0) {
                showMessage({ title: 'Analysis Failed', message: "The image analysis couldn't clearly identify any form fields. Please try a clearer image or a form with distinct labels.", type: 'warning' });
                setIsUploading(false);
                return;
            }

            // Limit to top 20 fields to avoid overwhelming the UI
            const finalFields = extractedFields.slice(0, 20);

            setGeneratedSchema({
                title: "Vision-Extracted Form",
                description: `Automatically extracted from ${file.name} using AI OCR. Please review the fields.`,
                fields: finalFields
            });

        } catch (error) {
            console.error("Image Analysis Error:", error);
            showMessage({ title: 'Analysis Error', message: "Error analyzing image: " + (error instanceof Error ? error.message : "Internal Error"), type: 'error' });
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        // Basic template columns
        const csvContent = "Field Name 1,Field Name 2,Field Name 3,Date,Category\nSample Text,Another Text,1234,2024-01-01,Option A";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "data_collection_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleInputChange = (id: string, value: any, field: FormField) => {
        let cleanValue = value;

        // Instant Validation Logic for Text
        if (field.type === 'text' && field.validation?.isNumeric && typeof value === 'string') {
            cleanValue = value.replace(/[^0-9\.]/g, '');
        }

        // Handle Checkbox Arrays
        if (field.type === 'checkbox') {
            const currentValues = Array.isArray(formData[id]) ? formData[id] : [];
            if (currentValues.includes(value)) {
                cleanValue = currentValues.filter((v: any) => v !== value);
            } else {
                cleanValue = [...currentValues, value];
            }
        }

        setFormData(prev => ({ ...prev, [id]: cleanValue }));
    };

    const handleFieldUpdate = (id: string, updates: Partial<FormField>) => {
        if (!generatedSchema) return;

        // Auto-apply mobile constraints
        if (updates.label && updates.label.toLowerCase().includes('mobile')) {
            updates.validation = {
                ...updates.validation, // keep existing (e.g. required?)
                isNumeric: true,
                minLength: 10,
                maxLength: 10
            };
            updates.placeholder = "10-digit mobile number";
        }

        setGeneratedSchema({
            ...generatedSchema,
            fields: generatedSchema.fields.map(f => f.id === id ? { ...f, ...updates } : f)
        });
    };

    const handleAddField = () => {
        if (!generatedSchema) return;
        const newField: FormField = {
            id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
        // Clean up editing state
        setEditingOptions(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Default Selection on Open is now handled specific to the action triggering the modal
    // ensuring we don't auto-select everything by default.
    /*
    useEffect(() => {
        if (isSharingModalOpen) {
            setSelectedSharedLabs(allLabs);
            setSelectedDesignations(allDesignations);
            // Select all valid non-admin users
            const validUsers = allUsers.filter(u => !['admin', 'superadmin', 'delegated admin'].includes(u.role?.toLowerCase()));
            setSelectedSharedUsers(validUsers.map(u => u._id));
        }
    }, [isSharingModalOpen, allLabs, allDesignations, allUsers]);
    */

    const handleSaveTemplate = async (isDistribution = false, overrideLabs?: string[], overrideUsers?: string[]) => {
        if (!generatedSchema) return;

        if (!templateName) {
            setIsNameModalOpen(true);
            return;
        }

        // If simple save, and we are not distributing, we should explicitly opt-out of notifications
        // However, if the user explicitly clicked "Distribute" (isDistribution = true), we want notifications.

        setIsSaving(true);
        const payload = {
            ...generatedSchema,
            title: templateName,
            description: templateDescription,
            sharedWithLabs: overrideLabs ?? selectedSharedLabs,
            sharedWithUsers: overrideUsers ?? selectedSharedUsers,
            isPublic: false,
            allowMultipleSubmissions: allowMultipleSubmissions,
            deadline: sharingDeadline || undefined,
            notifyUsers: isDistribution // Only notify if this is a Distribution action
        };

        let response;
        if (selectedTemplateId) {
            response = await updateActiveForm(selectedTemplateId, payload);
        } else {
            response = await createActiveForm(payload);
        }

        setIsSaving(false);
        if (response.success) {
            if (isDistribution) {
                showMessage({ title: 'Success', message: "Form distributed successfully!", type: 'success' });
                setIsSharingModalOpen(false);
            } else {
                setSaveMessage("Template saved successfully!");
                setTimeout(() => setSaveMessage(null), 3000);
                setIsRefining(false); // Switch to Preview Mode
            }

            setIsNameModalOpen(false);
            if (!selectedTemplateId && response.data?._id) {
                setSelectedTemplateId(response.data._id);
            }
            fetchInitialData(); // Refresh list
        } else {
            showMessage({ title: 'Save Failed', message: "Failed to save template: " + response.message, type: 'error' });
        }
    };



    const handleEditTemplate = (template: any) => {
        setGeneratedSchema({
            title: template.title,
            description: template.description,
            fields: template.fields
        });
        setTemplateName(template.title);
        setTemplateDescription(template.description || "");
        setSelectedTemplateId(template._id);
        setCurrentStep('creation');

        // Populate shared lists if they exist
        if (template.sharedWithLabs) setSelectedSharedLabs(template.sharedWithLabs);
        if (template.sharedWithUsers) setSelectedSharedUsers(template.sharedWithUsers);
    };



    const handleShareClick = (template: any, e: React.MouseEvent, mode: 'COLLECT' | 'COPY') => {
        e.stopPropagation();
        setTemplateName(template.title);
        setTemplateDescription(template.description || "");
        setSelectedTemplateId(template._id);
        setSharingMode(mode);
        setGeneratedSchema({
            title: template.title,
            description: template.description,
            fields: template.fields
        });

        // Pre-selection Logic for DISTRIBUTE (COLLECT) mode
        // If we are distributing, we should show who it is ALREADY distributed to.
        if (mode === 'COLLECT') {
            // We need to set the initial state of checkboxes to match existing shares
            // However, handleConfirmShare logic currently REPLACES the list (mostly).
            // Ideally we want to APPEND.
            // But existing logic in handleConfirmShare says:
            // "For collection/distribution, we update the template permissions... await handleSaveTemplate(true, [], finalUserList);"
            // And handleSaveTemplate does: "sharedWithUsers: overrideUsers ?? selectedSharedUsers"
            // So it OVERWRITES.
            // Thus, we MUST pre-populate `selectedSharedUsers` with `template.sharedWithUsers` so we don't lose existing users.

            setTimeout(() => {
                // Ensure template.sharedWithUsers is an array of IDs
                // The template object passed here likely has populated user objects or IDs.
                // We need to check the structure.
                // existingTemplates element structure:
                // In getTemplates controller: .populate('createdBy') is called.
                // sharedWithUsers is just an array of ObjectIds in the model, but usually not populated deeply unless specified?
                // Let's check getTemplates controller again.
                // It only populates 'createdBy'. So sharedWithUsers is [ObjectId].
                // But wait, in the UI we display "X Users" using `template.sharedWithUsers?.length`.
                // Ideally it is an array of strings (IDs).

                const existingUsers = template.sharedWithUsers || [];
                // If it's an array of objects, map to _id. If strings, use as is.
                const existingIds = existingUsers.map((u: any) => (typeof u === 'object' ? u._id : u));

                setSelectedSharedUsers(existingIds);
                setSelectedSharedLabs([]); // we don't implicitly select labs for safety
                setSelectedDesignations([]);
            }, 0);

        } else {
            // COPY mode - start fresh
            setTimeout(() => {
                setSelectedSharedLabs([]);
                setSelectedSharedUsers([]);
                setSelectedDesignations([]);
            }, 0);
        }

        setIsSharingModalOpen(true);
    };

    const handleConfirmShare = async () => {
        // Unified User Selection Logic
        // For both Share Copy and Distribute modes, we now:
        // 1. IGNORE the Lab/Designation selections for final payload (they are just UI filters)
        // 2. USE ONLY the explicitly checked users in the 3rd column

        // Exclude current user from final list if somehow included
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
            // For collection/distribution, we update the template permissions
            // We pass empty labs [] so that we don't share with entire labs, only selected users
            await handleSaveTemplate(true, [], finalUserList);
        } else {
            // Share Copy Mode
            if (!selectedTemplateId) return;

            setIsSaving(true);
            const response = await shareTemplateCopy(selectedTemplateId, finalUserList, sharingDeadline || undefined);
            setIsSaving(false);

            if (response.success) {
                setSaveMessage(`Template shared with ${response.data.count} users!`);
                setTimeout(() => setSaveMessage(''), 3000);
                setIsSharingModalOpen(false);
                setSharingMode('COLLECT'); // Reset default
                fetchInitialData(); // Refresh templates list
            } else {
                showMessage({ title: 'Sharing Failed', message: "Sharing failed: " + response.message, type: 'error' });
            }
        }
    };

    const handleCloneTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Confirm Clone',
            message: "Do you want to create a copy of this template?",
            type: 'info',
            confirmText: 'Create Copy',
            cancelText: 'Cancel'
        });
        if (confirmed) {
            const response = await cloneActiveForm(id);
            if (response.success) {
                setSaveMessage("Template cloned successfully!");
                setTimeout(() => setSaveMessage(''), 3000);
                fetchInitialData();
            } else {
                showMessage({ title: 'Error', message: response.message || 'Cloning failed', type: 'error' });
            }
        }
    };

    const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger selection
        const confirmed = await showConfirm({
            title: 'Confirm Delete',
            message: "Are you sure you want to delete this template? This cannot be undone.",
            type: 'error',
            confirmText: 'Delete Template',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        try {
            setIsSaving(true);
            const response = await deleteActiveForm(templateId);
            setIsSaving(false);
            if (response.success) {
                setExistingTemplates(prev => prev.filter(t => t._id !== templateId));
            } else {
                showMessage({ title: 'Delete Failed', message: "Failed to delete template: " + response.message, type: 'error' });
            }
        } catch (error) {
            console.error("Error deleting template:", error);
            setIsSaving(false);
            showMessage({ title: 'Error', message: "An error occurred while deleting the template.", type: 'error' });
        }
    };

    const handleToggleActive = async (template: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await showConfirm({
            title: 'Confirm Status Change',
            message: `Are you sure you want to ${template.isActive ? 'STOP' : 'RESUME'} collecting responses for this form?`,
            type: 'warning',
            confirmText: template.isActive ? 'Stop' : 'Resume',
            cancelText: 'Cancel'
        });
        if (!confirmed) return;

        setIsSaving(true);
        // We reuse handleSaveTemplate or call update directly. 
        // Since handleSaveTemplate is complex with modal state, simpler to call updateActiveForm directly.
        const payload = {
            ...template,
            isActive: !template.isActive,
            notifyUsers: false
        };

        const response = await updateActiveForm(template._id, payload);
        setIsSaving(false);
        if (response.success) {
            fetchInitialData();
        } else {
            showMessage({ title: 'Update Failed', message: "Failed to update status: " + response.message, type: 'error' });
        }
    };

    const handleViewSharedUsers = (template: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const sharedIds = template.sharedWithUsers || [];
        // Map IDs to full user objects from allUsers
        const users = allUsers.filter(u => sharedIds.includes(u._id));
        setViewingSharedUsersList(users);
        setViewingSharedTemplateTitle(template.title);
        setIsSharedUsersViewOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplateId && !generatedSchema) {
            showMessage({ title: 'Selection Required', message: "Please select a template or generate a form first.", type: 'warning' });
            return;
        }

        setIsSaving(true);
        const testPayload = {
            templateId: selectedTemplateId || "generated_temp",
            data: formData
        };

        const response = await submitFormData(testPayload);
        setIsSaving(false);
        if (response.success) {
            showMessage({ title: 'Success', message: "Data submitted successfully!", type: 'success' });
            setIsFillingModalOpen(false);
            setCurrentStep('selection');
            setFormData({});
            setGeneratedSchema(null);
            setSelectedTemplateId(null);
            fetchInitialData(); // Refresh to update isSubmitted status
        } else {
            showMessage({ title: 'Submission Failed', message: "Submission failed: " + response.message, type: 'error' });
        }
    };

    if (isSaving && id && !isFillingModalOpen) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-indigo-600 font-bold gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-headline tracking-wide text-sm">Loading secure form details...</p>
            </div>
        );
    }

    const myTemplates = existingTemplates.filter(t => (t.createdBy?._id || t.createdBy) === currentUser?._id);
    const sharedTemplates = existingTemplates.filter(t => (t.createdBy?._id || t.createdBy) !== currentUser?._id);

    return (
        <div className="container mx-auto py-10 px-4 md:px-8">
            {/* Template Name Modal */}
            {isSharedUsersViewOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-200 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] z-200">
                        <CardHeader className="border-b border-gray-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="font-headline">Shared Users</CardTitle>
                                <CardDescription>{viewingSharedTemplateTitle}</CardDescription>
                            </div>
                            <button onClick={() => setIsSharedUsersViewOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                            {viewingSharedUsersList.length > 0 ? (
                                <div className="divide-y divide-gray-100">
                                    {viewingSharedUsersList.map(user => (
                                        <div key={user._id} className="p-4 flex items-center gap-3 hover:bg-gray-50">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                {user.fullName?.[0] || user.email?.[0] || "U"}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{user.fullName || "Unknown"}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{user.labName || "No Lab"}</span>
                                                    {user.designation && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">{user.designation}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400">
                                    <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No individual users shared.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {isNameModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle className="font-headline">Save Template</CardTitle>
                            <CardDescription>Give your form template a clear name before saving.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <InputField
                                label="Template Name"
                                placeholder="e.g., Monthly Sample Report"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                autoFocus
                            />
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 tracking-wider font-heading ml-0.5">Description (Optional)</label>
                                <textarea
                                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm min-h-[80px]"
                                    placeholder="Briefly describe the purpose of this form..."
                                    value={templateDescription}
                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                />
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="allowMultiple"
                                        checked={allowMultipleSubmissions}
                                        onChange={(e) => setAllowMultipleSubmissions(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="allowMultiple" className="text-xs font-bold text-gray-500 tracking-normal cursor-pointer select-none">
                                        Allow Multiple Submissions by Same User
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 font-heading ml-0.5 uppercase tracking-widest">Submission Deadline (Optional)</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                                    value={sharingDeadline}
                                    onChange={(e) => setSharingDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Button variant="secondary" label="Cancel" onClick={() => setIsNameModalOpen(false)} />
                                <Button variant="primary" label="Confirm & Save" onClick={() => handleSaveTemplate(false)} disabled={!templateName.trim()} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sharing Modal */}
            {isSharingModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-110 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-6xl shadow-2xl border-none animate-in zoom-in-95 duration-300 overflow-hidden">
                        <CardHeader className="bg-indigo-600 text-white p-6">
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
                        <CardContent className="p-0">
                            <div className="flex h-[550px] divide-x divide-gray-100">
                                {(() => {
                                    // Permission Checks
                                    const canShareInterLab = hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);

                                    // Effective Lists based on permissions
                                    const labsForSharing = canShareInterLab
                                        ? allLabs
                                        : (currentUser?.labName ? [currentUser.labName] : []);

                                    const usersForSharing = canShareInterLab
                                        ? allUsers
                                        : allUsers.filter(u => u.labName === currentUser?.labName);

                                    return (
                                        <>
                                            {/* Column 1: Laboratories */}
                                            <div className="w-1/4 flex flex-col bg-white">
                                                <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                                                    <label className="text-[10px] font-bold text-gray-400 tracking-wider">1. Laboratories</label>
                                                    {canShareInterLab && (
                                                        <button
                                                            onClick={() => {
                                                                if (selectedSharedLabs.length === labsForSharing.length) {
                                                                    setSelectedSharedLabs([]);
                                                                } else {
                                                                    setSelectedSharedLabs([...labsForSharing]);
                                                                }
                                                            }}
                                                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                        >
                                                            {selectedSharedLabs.length === labsForSharing.length ? 'Deselect All' : 'Select All'}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                                    {labsForSharing.map(lab => (
                                                        <label key={lab} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${selectedSharedLabs.includes(lab) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSharedLabs.includes(lab)}
                                                                onChange={() => {
                                                                    if (!canShareInterLab) return; // Prevent changing if restricted to own lab
                                                                    setSelectedSharedLabs(prev =>
                                                                        prev.includes(lab) ? prev.filter(l => l !== lab) : [...prev, lab]
                                                                    );
                                                                }}
                                                                disabled={!canShareInterLab}
                                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                            />
                                                            <span className="text-xs font-bold leading-none">{lab}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Column 2: Designations */}
                                            <div className="w-1/4 flex flex-col bg-white">
                                                <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                                                    <label className="text-[10px] font-bold text-gray-400 tracking-wider">2. Designations</label>
                                                    <button
                                                        onClick={() => {
                                                            // Get designations available in selected labs
                                                            const visibleDesignations = Array.from(new Set(usersForSharing
                                                                .filter(u => selectedSharedLabs.includes(u.labName) && u.designation)
                                                                .map(u => u.designation)));

                                                            const allVisibleSelected = visibleDesignations.length > 0 && visibleDesignations.every(d => selectedDesignations.includes(d));

                                                            if (allVisibleSelected) {
                                                                setSelectedDesignations(prev => prev.filter(d => !visibleDesignations.includes(d)));
                                                            } else {
                                                                setSelectedDesignations(prev => Array.from(new Set([...prev, ...visibleDesignations])));
                                                            }
                                                        }}
                                                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                    >
                                                        {(() => {
                                                            const visibleDesignations = Array.from(new Set(usersForSharing
                                                                .filter(u => selectedSharedLabs.includes(u.labName) && u.designation)
                                                                .map(u => u.designation)));
                                                            const allVisibleSelected = visibleDesignations.length > 0 && visibleDesignations.every(d => selectedDesignations.includes(d));
                                                            return allVisibleSelected ? 'Deselect All' : 'Select All';
                                                        })()}
                                                    </button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                                    {(() => {
                                                        // Determine which designations to show
                                                        const visibleDesignations = Array.from(new Set(usersForSharing
                                                            .filter(u => selectedSharedLabs.includes(u.labName) && u.designation)
                                                            .map(u => u.designation))).sort();

                                                        if (visibleDesignations.length === 0) {
                                                            return <div className="p-4 text-xs text-center text-gray-400 italic">No designations found.</div>;
                                                        }

                                                        return visibleDesignations.map(desig => (
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
                                                                <span className="text-xs font-bold leading-none truncate" title={desig}>{desig}</span>
                                                            </label>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Column 3: Users */}
                                            <div className="w-2/4 flex flex-col bg-gray-50/30">
                                                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                                    <label className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                        3. Users (Filtered)
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            // Calculate the filtered list of users matching the DISPLAY filters
                                                            const validRecipients = usersForSharing.filter(u =>
                                                                !['admin', 'superadmin', 'delegated admin'].includes(u.role?.toLowerCase()) &&
                                                                u._id !== currentUser?._id // Exclude current user
                                                            );

                                                            // REQUIRE BOTH at least one lab AND at least one designation to be selected
                                                            const filteredUsers = (selectedSharedLabs.length === 0 || selectedDesignations.length === 0)
                                                                ? []
                                                                : validRecipients.filter(u => {
                                                                    const labMatch = selectedSharedLabs.includes(u.labName);
                                                                    const desigMatch = selectedDesignations.includes(u.designation);
                                                                    return labMatch && desigMatch;
                                                                });

                                                            const filteredUserIds = filteredUsers.map(u => u._id);

                                                            if (filteredUserIds.length > 0 && filteredUserIds.every(id => selectedSharedUsers.includes(id))) {
                                                                setSelectedSharedUsers(prev => prev.filter(id => !filteredUserIds.includes(id)));
                                                            } else {
                                                                setSelectedSharedUsers(prev => Array.from(new Set([...prev, ...filteredUserIds])));
                                                            }
                                                        }}
                                                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                    >
                                                        Select / Deselect Visible
                                                    </button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 custom-scrollbar content-start">
                                                    {(() => {
                                                        const validRecipients = usersForSharing.filter(u =>
                                                            !['admin', 'superadmin', 'delegated admin'].includes(u.role?.toLowerCase()) &&
                                                            u._id !== currentUser?._id // Exclude current user from selection
                                                        );

                                                        // REQUIRE BOTH at least one lab AND at least one designation to be selected before showing users
                                                        const filteredUsers = (selectedSharedLabs.length === 0 || selectedDesignations.length === 0)
                                                            ? []
                                                            : validRecipients.filter(u => {
                                                                // Match selected labs
                                                                const labMatch = selectedSharedLabs.includes(u.labName);
                                                                // Match selected designations
                                                                const desigMatch = selectedDesignations.includes(u.designation);
                                                                // Both conditions must pass
                                                                return labMatch && desigMatch;
                                                            });

                                                        if (filteredUsers.length === 0) {
                                                            return (
                                                                <div className="col-span-2 flex flex-col items-center justify-center pt-20 text-gray-400">
                                                                    <Share2 className="w-8 h-8 opacity-20 mb-2" />
                                                                    <p className="text-xs italic text-center px-4">
                                                                        {selectedSharedLabs.length === 0 || selectedDesignations.length === 0
                                                                            ? "Select at least one Lab and one Designation to view eligible users."
                                                                            : "No users match the chosen criteria."}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        return filteredUsers.map(u => (
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
                                                                    <span className="text-xs font-bold text-gray-900 truncate">
                                                                        {u.fullName || "Unnamed User"}
                                                                        {u.designation && <span className="text-gray-400 font-normal">, {u.designation}</span>}
                                                                    </span>
                                                                    <span className="text-[10px] text-indigo-600 font-bold tracking-normal truncate">({u.labName})</span>
                                                                </div>
                                                            </label>
                                                        ));
                                                    })()}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white rounded-b-xl">
                                <p className="text-[10px] text-gray-400 font-medium">
                                    {selectedSharedUsers.length} Users selected.
                                </p>
                                <div className="flex gap-3">
                                    {sharingMode === 'COLLECT' && (
                                        <Button
                                            label="Copy Link"
                                            variant="secondary"
                                            icon={<Link className="w-4 h-4" />}
                                            onClick={() => {
                                                const link = `${window.location.origin}/data-collection`;
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
                                        className="px-8 shadow-lg shadow-indigo-200"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}


            {/* Filling Modal */}
            {
                isFillingModalOpen && generatedSchema && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-150 flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
                        <Card className="w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-none animate-in zoom-in-95 duration-300">
                            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 p-8 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl font-bold font-headline tracking-tight text-gray-900 dark:text-gray-100">{generatedSchema.title}</CardTitle>
                                        <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">{generatedSchema.description}</CardDescription>
                                    </div>
                                </div>
                                <Button
                                    variant="secondary"
                                    label="Discard & Close"
                                    onClick={() => {
                                        setIsFillingModalOpen(false);
                                        setFormData({});
                                        setGeneratedSchema(null);
                                        setSelectedTemplateId(null);
                                    }}
                                    className="bg-white dark:bg-gray-800 text-gray-500 hover:text-red-600 transition-colors border-none"
                                />
                            </CardHeader>

                            <CardContent className="p-10 overflow-y-auto flex-1 dark:bg-gray-900/50">
                                <form onSubmit={handleSubmit} className="space-y-10 max-w-4xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        {generatedSchema.fields.map((field) => {
                                            const isWide = ['textarea'].includes(field.type) || field.label.length > 30;
                                            const spanClass = isWide ? 'md:col-span-2' : 'md:col-span-1';

                                            return (
                                                <div key={field.id} className={`${spanClass}`}>
                                                    {field.type === 'text' && (
                                                        <InputField
                                                            id={field.id}
                                                            label={field.label}
                                                            placeholder={field.placeholder}
                                                            required={field.required}
                                                            type={field.validation?.isEmail ? 'email' : 'text'}
                                                            value={formData[field.id] || ''}
                                                            onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                                                            icon={field.validation?.isNumeric ? <span className="text-[10px] font-bold">123</span> : <Type className="w-4 h-4" />}
                                                        />
                                                    )}

                                                    {field.type === 'select' && field.options && (
                                                        <div className="mb-4">
                                                            <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-1.5 ml-0.5 font-heading">
                                                                {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                            </label>
                                                            <DropDownWithSearch
                                                                options={field.options}
                                                                placeholder={`Choose ${field.label.toLowerCase()}...`}
                                                                selectedValue={formData[field.id] || ''}
                                                                onChange={(val) => handleInputChange(field.id, val, field)}
                                                            />
                                                        </div>
                                                    )}

                                                    {field.type === 'radio' && field.options && (
                                                        <div className="mb-4">
                                                            <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-3 ml-0.5 font-heading">
                                                                {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                            </label>
                                                            <div className="flex flex-wrap gap-6">
                                                                {field.options.map((opt) => (
                                                                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                                                                        <div className="relative flex items-center justify-center">
                                                                            <input
                                                                                type="radio"
                                                                                name={field.id}
                                                                                value={opt.value}
                                                                                checked={formData[field.id] === opt.value}
                                                                                onChange={() => handleInputChange(field.id, opt.value, field)}
                                                                                className="peer appearance-none w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full checked:border-indigo-600 transition-all"
                                                                            />
                                                                            <div className="absolute w-3 h-3 bg-indigo-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{opt.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {field.type === 'checkbox' && field.options && (
                                                        <div className="mb-4">
                                                            <label className="block text-[10px] font-bold text-gray-400 tracking-wider mb-3 ml-0.5 font-heading">
                                                                {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                            </label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                {field.options.map((opt) => (
                                                                    <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData[field.id]?.includes(opt.value) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 dark:border-indigo-500' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200'}`}>
                                                                        <div className="relative flex items-center justify-center">
                                                                            <input
                                                                                type="checkbox"
                                                                                value={opt.value}
                                                                                checked={formData[field.id]?.includes(opt.value)}
                                                                                onChange={() => handleInputChange(field.id, opt.value, field)}
                                                                                className="peer appearance-none w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                                                                            />
                                                                            <CheckCircle2 className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{opt.label}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {field.type === 'date' && (
                                                        <InputField
                                                            id={field.id}
                                                            type="date"
                                                            label={field.label}
                                                            required={field.required}
                                                            value={formData[field.id] || ''}
                                                            onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                                                            icon={<Calendar className="w-4 h-4" />}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-12 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-gray-100 dark:border-gray-800">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            label="Cancel"
                                            onClick={() => {
                                                setIsFillingModalOpen(false);
                                                setFormData({});
                                                setGeneratedSchema(null);
                                                setSelectedTemplateId(null);
                                            }}
                                            className="w-full sm:w-auto px-8"
                                        />
                                        <Button
                                            type="submit"
                                            label="Securely Submit Data"
                                            icon={<CheckCircle2 className="w-5 h-5" />}
                                            size="lg"
                                            loading={isSaving}
                                            className="w-full sm:w-auto px-12 shadow-xl shadow-indigo-500/20"
                                        />
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )
            }

            {
                currentStep === 'selection' ? (
                    <>
                        <div className="max-w-4xl mx-auto text-center mb-12">
                            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-headline tracking-tighter">Data Collection Hub</h1>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">Manage your data lifecycle - from architecting intelligent forms to filling shared distributions.</p>
                        </div>

                        <div className={`grid grid-cols-1 md:grid-cols-2 ${currentUser?.role?.toLowerCase() === 'superadmin' ? 'xl:grid-cols-3 max-w-7xl' : 'xl:grid-cols-4 max-w-[1400px]'} gap-6 mx-auto px-4`}>
                            {/* Part 1: Create New Form */}
                            <Card
                                className="group hover:border-indigo-500 transition-all cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-indigo-50/30 overflow-hidden flex flex-col h-[500px]"
                                onClick={() => setCurrentStep('creation')}
                            >
                                <CardContent className="p-10 flex-1 flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
                                        <Sparkles className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-headline">Create New Form</h3>
                                    <p className="text-gray-500 dark:text-gray-400">Generate a custom form using AI prompts, upload a CSV template or even a form image</p>
                                </CardContent>
                            </Card>

                            {/* Part 2: Shared By Me (Distributed Forms) */}
                            <Card className="border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col h-[500px] bg-white dark:bg-gray-800">
                                <CardHeader className="bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 pb-4">
                                    <CardTitle className="text-xl flex items-center gap-2 font-headline text-emerald-700 dark:text-emerald-400">
                                        <div className="flex items-center">
                                            <Share2 className="w-5 h-5 mr-1" />
                                            <ArrowUpRight className="w-4 h-4" />
                                        </div>
                                        {['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? "Manage Shared Forms" : "Shared By Me"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {(['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? existingTemplates : myTemplates).filter(t => t.isPublic || (t.sharedWithLabs && t.sharedWithLabs.length > 0) || (t.sharedWithUsers && t.sharedWithUsers.length > 0)).length > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {(['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? existingTemplates : myTemplates).filter(t => t.isPublic || (t.sharedWithLabs && t.sharedWithLabs.length > 0) || (t.sharedWithUsers && t.sharedWithUsers.length > 0)).map((template) => (
                                                <div
                                                    key={template._id}
                                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex flex-col gap-3 group cursor-pointer"
                                                    onClick={() => handleEditTemplate(template)}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 transition-colors tracking-tight">{template.title}</h4>
                                                                {['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') && (
                                                                    <span className="px-1.5 py-0.5 bg-gray-100 text-[8px] font-bold text-gray-500 rounded uppercase tracking-tighter">System</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-indigo-600 font-bold opacity-70 mb-1">
                                                                By: {template.createdBy?.fullName || template.createdBy?.email || 'System'}
                                                                {template.createdBy?.labName ? ` (${template.createdBy.labName})` : ''}
                                                            </p>
                                                            <p className="text-xs text-gray-400 line-clamp-1">{template.description}</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleToggleActive(template, e)}
                                                            className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition-all shadow-sm ${template.isActive !== false
                                                                ? "bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700 hover:content-['STOP']"
                                                                : "bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
                                                                }`}
                                                            title={template.isActive !== false ? "Click to Stop Responses" : "Click to Resume Responses"}
                                                        >
                                                            {template.isActive !== false ? "Active" : "Stopped"}
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={(e) => handleViewSharedUsers(template, e)}
                                                                className="flex items-center gap-2 text-xs text-gray-400 font-medium hover:text-indigo-600 hover:underline transition-colors"
                                                                title="View Shared Users"
                                                            >
                                                                <User className="w-3 h-3" />
                                                                {template.sharedWithUsers?.length || 0} Shared
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setViewingSubmissionsTemplate({
                                                                        title: template.title,
                                                                        fields: template.fields
                                                                    });
                                                                    setSelectedTemplateId(template._id);
                                                                }}
                                                                className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors text-xs font-bold flex items-center gap-1 shadow-sm"
                                                                title="View Responses"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                {template.responseCount || 0} Responses
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleShareClick(template, e, 'COLLECT')}
                                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="Distribute More"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                                            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No active distributions.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Part 3: My Templates (or Manage Templates for Admin) */}
                            <Card className="border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col h-[500px] bg-white dark:bg-gray-800">
                                <CardHeader className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 pb-4">
                                    <CardTitle className="text-xl flex items-center justify-between font-headline text-gray-500 w-full">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-5 h-5" />
                                            {['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? "Manage Templates" : "My Templates"}
                                        </div>
                                        {['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') && (
                                            <button
                                                onClick={() => setCurrentStep('creation')}
                                                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                                                title="Create New Template"
                                            >
                                                <PlusCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 flex-1 overflow-y-auto">
                                    {(['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? existingTemplates : myTemplates).length > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {(['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') ? existingTemplates : myTemplates).map((template) => (
                                                <div
                                                    key={template._id}
                                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group cursor-pointer"
                                                    onClick={() => handleEditTemplate(template)}
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 transition-colors tracking-tight">{template.title}</h4>
                                                            {['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '') && (
                                                                <span className="px-1.5 py-0.5 bg-gray-100 text-[8px] font-bold text-gray-500 rounded uppercase tracking-tighter">System</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-indigo-600 font-bold opacity-70 mb-1">
                                                            By: {template.createdBy?.fullName || template.createdBy?.email || 'System'}
                                                            {template.createdBy?.labName ? ` (${template.createdBy.labName})` : ''}
                                                        </p>
                                                        <p className="text-xs text-gray-400 line-clamp-1">{template.description || "No description"}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={(e) => handleShareClick(template, e, 'COLLECT')}
                                                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
                                                            title="Distribute Form"
                                                        >
                                                            <Share2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleShareClick(template, e, 'COPY')}
                                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                            title="Share Template Copy"
                                                        >
                                                            <Share2 className="w-4 h-4 rotate-180" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleCloneTemplate(template._id, e)}
                                                            className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDeleteTemplate(template._id, e)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No templates.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Part 4: Shared With Me (Pending) */}
                            {currentUser?.role?.toLowerCase() !== 'superadmin' && (
                                <Card className="border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden flex flex-col h-[500px] bg-white dark:bg-gray-800">
                                    <CardHeader className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 pb-4">
                                        <CardTitle className="text-xl flex items-center gap-2 font-headline text-indigo-700 dark:text-indigo-400">
                                            <div className="flex items-center">
                                                <ArrowDownLeft className="w-5 h-5" />
                                            </div>
                                            Shared With Me
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 flex-1 overflow-y-auto">
                                        {sharedTemplates.length > 0 ? (
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {sharedTemplates.map((template) => (
                                                    <div
                                                        key={template._id}
                                                        className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex flex-col group cursor-pointer space-y-2"
                                                        onClick={() => {
                                                            if (template.isSubmitted && !template.allowMultipleSubmissions) {
                                                                showMessage({ title: 'Already Submitted', message: "You have already submitted this form.", type: 'info' });
                                                                return;
                                                            }
                                                            setGeneratedSchema({
                                                                title: template.title,
                                                                description: template.description,
                                                                fields: template.fields
                                                            });
                                                            setTemplateName(template.title);
                                                            setSelectedTemplateId(template._id);
                                                            setIsFillingModalOpen(true);
                                                        }}
                                                    >
                                                        {/* Top Row: Title and Status Actions */}
                                                        <div className="flex items-center justify-between gap-4">
                                                            <h4 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 transition-colors tracking-tight truncate flex-1">
                                                                {template.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {template.isSubmitted ? (
                                                                    <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        Submitted
                                                                    </div>
                                                                ) : (
                                                                    <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold tracking-wide">
                                                                        Action Required
                                                                    </div>
                                                                )}

                                                                {currentUser?.role?.toLowerCase() === 'superadmin' && (
                                                                    <button
                                                                        onClick={(e) => handleDeleteTemplate(template._id, e)}
                                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                        title="Delete Template (Superadmin)"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {(template.isSubmitted || ['superadmin', 'admin'].includes(currentUser?.role?.toLowerCase() || '')) && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setViewingSubmissionsTemplate({
                                                                                title: template.title,
                                                                                fields: template.fields
                                                                            });
                                                                            setSelectedTemplateId(template._id);
                                                                        }}
                                                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                        title="View Responses"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Bottom Row: Sharer Details */}
                                                        <div className="text-xs text-gray-400 text-left mt-1">
                                                            <p
                                                                className="truncate"
                                                                title={`By: ${template.createdBy?.fullName || 'Internal Department'}${template.createdBy?.designation ? `, ${template.createdBy.designation}` : ''}${template.createdBy?.labName ? ` (${template.createdBy.labName})` : ''}`}
                                                            >
                                                                By: {template.createdBy?.fullName || 'Internal Department'}
                                                                {template.createdBy?.designation ? `, ${template.createdBy.designation}` : ''}
                                                                {template.createdBy?.labName ? ` (${template.createdBy.labName})` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-12 text-center text-gray-400 h-full flex flex-col items-center justify-center">
                                                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>No pending forms shared.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    label="Back to Hub"
                                    onClick={() => {
                                        setCurrentStep('selection');
                                        setGeneratedSchema(null);
                                        setTemplateName('');
                                        setSelectedTemplateId(null);
                                    }}
                                    className="bg-transparent border-none text-gray-400 hover:text-indigo-600 px-0 shadow-none border-0"
                                    icon={<span className="text-xl">←</span>}
                                />
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1 font-headline tracking-tighter leading-none">
                                        {currentStep === 'creation' ? 'Design Center' : 'Data Entry Terminal'}
                                    </h1>
                                    <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold tracking-widest opacity-60 leading-none">
                                        {currentStep === 'creation'
                                            ? 'Dynamic Form Architect'
                                            : `Active Template: ${templateName}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {saveMessage && (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2 border border-emerald-100 shadow-sm">
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
                                            label="Distribute"
                                            onClick={() => {
                                                setSharingMode('COLLECT');

                                                // Auto-select own lab if restricted
                                                const canShareInterLab = hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);
                                                if (!canShareInterLab && currentUser?.labName) {
                                                    setSelectedSharedLabs([currentUser.labName]);
                                                } else {
                                                    setSelectedSharedLabs([]);
                                                }

                                                setSelectedSharedUsers([]);
                                                setSelectedDesignations([]); // Reset designations

                                                // Pre-select existing shares if editing
                                                if (selectedTemplateId) {
                                                    const tem = existingTemplates.find(t => t._id === selectedTemplateId);
                                                    if (tem) {
                                                        if (tem.sharedWithLabs) setSelectedSharedLabs(tem.sharedWithLabs);
                                                        if (tem.sharedWithUsers) setSelectedSharedUsers(tem.sharedWithUsers);
                                                    }
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

                        {!generatedSchema && !isGenerating ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                <Card className="border-indigo-100 shadow-md h-full overflow-hidden">
                                    <CardHeader className="bg-linear-to-r from-indigo-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                                        <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                            <Sparkles className="w-5 h-5" />
                                            AI Form Generator
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div className="flex flex-col gap-4 h-full">
                                            <textarea
                                                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none min-h-[140px] text-sm shadow-inner bg-gray-50/30"
                                                placeholder="e.g., Create a form with: 1. Project Name..."
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                            />
                                            <div className="flex justify-between items-center mt-auto">
                                                <p className="text-[10px] text-gray-400 font-medium italic">Tip: Use "Lab names" to pre-fill from DB</p>
                                                <Button
                                                    onClick={generateFromPrompt}
                                                    loading={isGenerating}
                                                    disabled={!prompt.trim() || isUploading}
                                                    icon={<Sparkles className="w-4 h-4" />}
                                                    label="Generate Form"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-indigo-100 shadow-md h-full overflow-hidden">
                                    <CardHeader className="bg-linear-to-r from-purple-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                                        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                                            <Upload className="w-5 h-5" />
                                            Template Upload
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        <div
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer group h-full min-h-[188px]"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileSelect} />
                                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                <Upload className="w-8 h-8 text-purple-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 mb-1">Upload CSV File</p>
                                            <p className="text-xs text-gray-500 italic">Supports .CSV (Max 100KB)</p>
                                        </div>

                                        <Button
                                            onClick={handleDownloadTemplate}
                                            variant="secondary"
                                            className="w-full border-dashed border-2 hover:border-purple-500 hover:bg-purple-50 transition-all py-6"
                                            icon={<Download className="w-4 h-4 text-purple-600" />}
                                            label="Download Template CSV"
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="border-indigo-100 shadow-md h-full overflow-hidden">
                                    <CardHeader className="bg-linear-to-r from-orange-50 to-white dark:from-gray-800 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
                                        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                            <ImageIcon className="w-5 h-5" />
                                            Image Analysis
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <div
                                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 transition-colors cursor-pointer group h-full min-h-[188px]"
                                            onClick={() => imageInputRef.current?.click()}
                                        >
                                            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                <ImageIcon className="w-8 h-8 text-orange-600" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 mb-1">Upload Form Image</p>
                                            <p className="text-xs text-gray-500 italic">Analyze image to extract fields</p>
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
                                <p className="text-gray-500">
                                    {isUploading ? "Our AI is extracting structural data directly from your image." : "Our AI is architecting your data collection template."}
                                </p>
                            </div>
                        ) : (
                            <Card className={`shadow-2xl border-none overflow-hidden transition-all duration-500 ${isRefining ? 'ring-2 ring-indigo-500 shadow-indigo-500/20' : ''}`}>
                                <CardHeader className={`${isRefining ? 'bg-indigo-600' : 'bg-gray-900'} text-white p-8 transition-colors duration-500`}>
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <div>
                                            {isRefining ? (
                                                <div className="space-y-2 w-full min-w-[300px]">
                                                    <input
                                                        type="text"
                                                        value={templateName}
                                                        onChange={(e) => setTemplateName(e.target.value)}
                                                        className="bg-transparent border-b-2 border-white/30 text-3xl font-bold font-headline tracking-tight text-white placeholder-white/50 focus:outline-none focus:border-white w-full"
                                                        placeholder="Form Title"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={templateDescription}
                                                        onChange={(e) => setTemplateDescription(e.target.value)}
                                                        className="bg-transparent border-b border-indigo-100/30 text-indigo-100/90 text-sm focus:outline-none focus:border-indigo-100/50 w-full placeholder-indigo-100/50"
                                                        placeholder="Form description..."
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3">
                                                        <CardTitle className="text-3xl font-bold font-headline tracking-tight">{templateName || generatedSchema?.title || 'Form Architect'}</CardTitle>
                                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] font-bold tracking-wide text-white shadow-lg">
                                                            Testing Mode
                                                        </span>
                                                    </div>
                                                    <CardDescription className="text-indigo-100/70 mt-1">
                                                        {templateDescription || generatedSchema?.description || "Architect Preview: Verify the generated structure and test field behavior before finalizing."}
                                                    </CardDescription>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-10 pb-12">
                                    <form className="space-y-10 max-w-5xl mx-auto" onSubmit={(e) => e.preventDefault()}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            {(generatedSchema?.fields || []).map((field) => (
                                                <div key={field.id} className={`${['textarea'].includes(field.type) || field.label.length > 30 ? 'md:col-span-2' : ''} relative group transition-all duration-200 ${isRefining ? 'p-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20' : ''}`}>
                                                    {isRefining && (
                                                        <button type="button" onClick={() => handleDeleteField(field.id)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 z-10">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isRefining ? (
                                                        <div className="space-y-4">
                                                            <InputField label="Field Label" value={field.label} onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })} />
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Type</label>
                                                                    <select className="w-full p-2.5 rounded-xl border border-gray-200 text-sm" value={field.type} onChange={(e) => handleFieldUpdate(field.id, { type: e.target.value as any })}>
                                                                        <option value="text">Text Input</option>
                                                                        <option value="select">Dropdown</option>
                                                                        <option value="date">Date Picker</option>
                                                                        <option value="radio">Radio</option>
                                                                        <option value="checkbox">Checkbox</option>
                                                                    </select>
                                                                </div>
                                                                {field.type === 'text' && (
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Options</label>
                                                                        <label className="flex items-center gap-2 cursor-pointer pt-2 group">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={field.validation?.isNumeric || false}
                                                                                onChange={(e) => {
                                                                                    const isChecked = e.target.checked;
                                                                                    handleFieldUpdate(field.id, {
                                                                                        validation: {
                                                                                            ...field.validation,
                                                                                            isNumeric: isChecked,
                                                                                            isEmail: isChecked ? false : field.validation?.isEmail
                                                                                        },
                                                                                        placeholder: isChecked ? "Numbers only..." : `Enter ${field.label}`
                                                                                    });
                                                                                }}
                                                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                                            />
                                                                            <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Numeric Only</span>
                                                                        </label>
                                                                    </div>
                                                                )}
                                                                {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Options (comma separated)</label>
                                                                        <input
                                                                            type="text"
                                                                            className="w-full p-2.5 rounded-xl border border-gray-200 text-sm"
                                                                            value={editingOptions[field.id] ?? (field.options?.map(o => o.label).join(', ') || '')}
                                                                            onChange={(e) => setEditingOptions(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                                            onBlur={() => {
                                                                                const val = editingOptions[field.id];
                                                                                if (val === undefined) return;
                                                                                handleFieldUpdate(field.id, { options: val.split(',').map(o => o.trim()).filter(Boolean).map(o => ({ label: o, value: o.toLowerCase().replace(/\s+/g, '_') })) });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {field.type === 'text' && (
                                                                <InputField
                                                                    id={field.id}
                                                                    label={field.label}
                                                                    placeholder={field.placeholder || "Enter text..."}
                                                                    required={field.required}
                                                                    type={field.validation?.isEmail ? 'email' : 'text'}
                                                                    value={formData[field.id] || ''}
                                                                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                                                                    icon={field.validation?.isNumeric ? <span className="text-[10px] font-bold">123</span> : <Type className="w-4 h-4" />}
                                                                    maxLength={field.validation?.maxLength}
                                                                    minLength={field.validation?.minLength}
                                                                />
                                                            )}

                                                            {field.type === 'select' && field.options && (
                                                                <div className="mb-4">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5 font-heading">
                                                                        {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                                    </label>
                                                                    <DropDownWithSearch
                                                                        options={field.options}
                                                                        placeholder={`Choose ${field.label.toLowerCase()}...`}
                                                                        selectedValue={formData[field.id] || ''}
                                                                        onChange={(val) => handleInputChange(field.id, val, field)}
                                                                    />
                                                                </div>
                                                            )}

                                                            {field.type === 'radio' && field.options && (
                                                                <div className="mb-4">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-0.5 font-heading">
                                                                        {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                                    </label>
                                                                    <div className="flex flex-wrap gap-6">
                                                                        {field.options.map((opt) => (
                                                                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                                                                                <div className="relative flex items-center justify-center">
                                                                                    <input
                                                                                        type="radio"
                                                                                        name={`preview_${field.id}`}
                                                                                        value={opt.value}
                                                                                        checked={formData[field.id] === opt.value}
                                                                                        onChange={() => handleInputChange(field.id, opt.value, field)}
                                                                                        className="peer appearance-none w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full checked:border-indigo-600 transition-all"
                                                                                    />
                                                                                    <div className="absolute w-3 h-3 bg-indigo-600 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                                </div>
                                                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">{opt.label}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {field.type === 'checkbox' && field.options && (
                                                                <div className="mb-4">
                                                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-0.5 font-heading">
                                                                        {field.label} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                                                    </label>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        {field.options.map((opt) => (
                                                                            <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${formData[field.id]?.includes(opt.value) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 dark:border-indigo-500' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-indigo-200'}`}>
                                                                                <div className="relative flex items-center justify-center">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        value={opt.value}
                                                                                        checked={formData[field.id]?.includes(opt.value)}
                                                                                        onChange={() => handleInputChange(field.id, opt.value, field)}
                                                                                        className="peer appearance-none w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg checked:bg-indigo-600 checked:border-indigo-600 transition-all"
                                                                                    />
                                                                                    <CheckCircle2 className="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                                </div>
                                                                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{opt.label}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {field.type === 'date' && (
                                                                <InputField
                                                                    id={field.id}
                                                                    type="date"
                                                                    label={field.label}
                                                                    required={field.required}
                                                                    value={formData[field.id] || ''}
                                                                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                                                                    icon={<Calendar className="w-4 h-4" />}
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {isRefining && (
                                                <div className="md:col-span-2 flex flex-col gap-6 py-4">
                                                    <div className="flex justify-center">
                                                        <button type="button" onClick={handleAddField} className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-xs tracking-wider">
                                                            <Plus className="w-4 h-4" /> Add New Field
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-end pt-6 border-t border-indigo-100">
                                                        <Button
                                                            variant="primary"
                                                            size="lg"
                                                            label="Finalize & Save"
                                                            onClick={() => handleSaveTemplate(false)}
                                                            icon={<Save className="w-4 h-4" />}
                                                            loading={isSaving}
                                                            className="shadow-xl shadow-indigo-500/20"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {!isRefining && (
                                                <div className="md:col-span-2 mt-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-2">
                                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                                        <div className="p-3 bg-indigo-600 text-white rounded-xl hidden sm:block">
                                                            <Sparkles className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">This is a Form Preview</p>
                                                            <p className="text-sm text-gray-500">You are currently in testing mode. Distribute the form to begin actual data collection.</p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="primary"
                                                        label="Distribute Form"
                                                        onClick={() => {
                                                            setSharingMode('COLLECT');

                                                            // Auto-select own lab if restricted
                                                            const canShareInterLab = hasPermission(FeatureCodes.FEATURE_FORM_MANAGEMENT_INTER_LAB);
                                                            if (!canShareInterLab && currentUser?.labName) {
                                                                setSelectedSharedLabs([currentUser.labName]);
                                                            } else {
                                                                setSelectedSharedLabs([]);
                                                            }

                                                            setIsSharingModalOpen(true);
                                                        }}
                                                        icon={<Share2 className="w-4 h-4" />}
                                                        className="w-full sm:w-auto px-8 shadow-lg shadow-indigo-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )
            }
            {/* Profile View Modal */}
            <UserProfileViewModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                userId={selectedProfileUserId}
            />

            {/* Submissions View Modal */}
            {
                viewingSubmissionsTemplate && selectedTemplateId && (
                    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                            <FormSubmissionsView
                                templateId={selectedTemplateId}
                                formSchema={viewingSubmissionsTemplate}
                                onClose={() => {
                                    setViewingSubmissionsTemplate(null);
                                    setSelectedTemplateId(null);
                                }}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
}
