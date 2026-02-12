/**
 * @fileoverview Source File - Part of the application codebase
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-02-09
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/images/logo1.png';

// Define interfaces if not already available globally
interface FormField {
    id: string;
    type: string;
    label: string;
    required?: boolean;
    options?: { label: string; value: string }[];
}

interface Submission {
    _id: string;
    submittedBy?: {
        fullName: string;
        email: string;
        designation: string;
        mobileNo?: string;
    };
    labName?: string;
    createdAt: string;
    ipAddress?: string;
    data: Record<string, any>;
}

// Helper to format date
const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
};

export const generateSubmissionPDF = async (
    submission: Submission,
    formSchema: { title: string; fields: FormField[] },
    chainHistory: any[]
) => {
    const doc = new jsPDF();

    // --- Logo & Header ---
    try {
        const img = await loadImage(logo);
        // Add CSIR Logo
        doc.addImage(img, 'PNG', 14, 10, 20, 20); // Adjust size/pos as needed
    } catch (e) {
        console.error("Failed to load logo", e);
    }

    doc.setFontSize(18);
    doc.setTextColor(40, 53, 147); // Indigo
    // Title with "Response of -" prefix
    doc.text(`Response of - ${formSchema.title}`, 14, 38);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44);

    // --- Submission Details ---
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Submission Details', 14, 55);

    const submissionDetails = [
        ['Submitted By', submission.submittedBy?.fullName || 'Unknown'],
        ['Email', submission.submittedBy?.email || 'N/A'],
        ['Designation', submission.submittedBy?.designation || 'N/A'],
        ['Lab / Institution', submission.labName || 'N/A'],
        ['Submission Date', formatDate(submission.createdAt)],
        ['IP Address', submission.ipAddress || 'Not Captured'],
    ];

    autoTable(doc, {
        startY: 60,
        head: [],
        body: submissionDetails,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });

    // --- Form Data ---
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(14);
    doc.setTextColor(40, 53, 147);
    doc.text('Form Responses', 14, finalY);

    const formData = formSchema.fields.map((field) => {
        let value = submission.data?.[field.id];

        // Format complex values
        if (Array.isArray(value)) {
            value = value.join(', ');
        } else if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
        } else if (value === true) {
            value = 'Yes';
        } else if (value === false) {
            value = 'No';
        } else {
            value = value || '';
        }

        return [field.label, value];
    });

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Question', 'Answer']],
        body: formData,
        headStyles: { fillColor: [40, 53, 147], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' } },
        didDrawPage: () => {
            // Header is only needed if it spans multiple pages
        }
    });

    // --- Movement History ---
    finalY = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(40, 53, 147);
    doc.text('Movement History', 14, finalY);

    if (chainHistory && chainHistory.length > 0) {
        const historyData = chainHistory.map((step, index) => {
            // Determine action label exactly like the UI
            let actionLabel = step.type;
            // Basic mapping based on what I saw in MovementHistory.tsx
            // const actionLabel = step.type === 'INITIATED' 
            //    ? 'INITIATED' 
            //    : (step.action || (step.type === 'RETURNED' ? 'RETURNED' : 'DELEGATED'));

            // Use a cleaner display for PDF
            if (step.type === 'INITIATED') actionLabel = 'Initiated';
            else if (step.type === 'RETURNED') actionLabel = 'Returned';
            else if (step.type === 'DELEGATED') actionLabel = 'Delegated';
            else if (step.action) actionLabel = step.action;

            const fromUser = step.fromUser ? `${step.fromUser.fullName} (${step.fromUser.designation})` : 'System';
            const toUser = step.toUser ? `${step.toUser.fullName} (${step.toUser.designation})` : (index === chainHistory.length - 1 ? 'Current Holder' : 'N/A');
            const remarks = step.remarks || '-';
            const date = formatDate(step.createdAt || step.timestamp); // Adjust based on actual field

            return [actionLabel, fromUser, toUser, remarks, date];
        });

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Action', 'From', 'To', 'Remarks', 'Date']],
            body: historyData,
            headStyles: { fillColor: [76, 175, 80], textColor: 255 }, // Green for history
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold' },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { cellWidth: 50 },
                4: { cellWidth: 35 },
            },
        });
    } else {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text('No movement history recorded.', 14, finalY + 10);
    }

    // Save the PDF
    const filename = `${formSchema.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${submission._id.substring(0, 8)}.pdf`;
    doc.save(filename);
};
