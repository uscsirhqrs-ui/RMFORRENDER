import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { LucideBookOpen, LucideCalendar, LucideFlag, LucideUser, LucideTag, LucideFileText } from 'lucide-react-native';

const InfoRow = ({ icon: Icon, label, value, color = '#6b7280' }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
        <View style={{ backgroundColor: '#eff6ff', padding: 8, borderRadius: 20, marginRight: 12 }}>
            <Icon size={18} color="#2563eb" />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>{label}</Text>
            <Text style={{ fontSize: 14, color: '#1f2937' }}>{value || 'N/A'}</Text>
        </View>
    </View>
);

const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'in progress': return { bg: '#fef3c7', text: '#d97706' };
        case 'completed': case 'closed': return { bg: '#d1fae5', text: '#059669' };
        case 'pending': return { bg: '#dbeafe', text: '#2563eb' };
        case 'overdue': return { bg: '#fee2e2', text: '#dc2626' };
        default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
};

const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
        case 'high': case 'urgent': return { bg: '#fee2e2', text: '#dc2626' };
        case 'medium': return { bg: '#fef3c7', text: '#d97706' };
        case 'low': return { bg: '#d1fae5', text: '#059669' };
        default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
};

const ReferenceDetailsScreen = ({ route }) => {
    const { reference } = route.params;
    const statusColor = getStatusColor(reference.status);
    const priorityColor = getPriorityColor(reference.priority);

    const createdBy = reference.createdBy?.fullName || reference.createdBy || 'N/A';
    const markedTo = reference.markedTo?.fullName || reference.markedTo || 'N/A';

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 }}>
                    {reference.referenceNo || reference.refId || 'N/A'}
                </Text>
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
                    {reference.subject || reference.title || 'Untitled Reference'}
                </Text>
                {/* Status & Priority badges */}
                <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
                    <View style={{ backgroundColor: statusColor.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: statusColor.text, fontSize: 12, fontWeight: '600' }}>
                            {reference.status || 'Unknown'}
                        </Text>
                    </View>
                    <View style={{ backgroundColor: priorityColor.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: priorityColor.text, fontSize: 12, fontWeight: '600' }}>
                            {reference.priority || 'Normal'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Details Card */}
            <View style={{ margin: 16, backgroundColor: '#ffffff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <InfoRow
                    icon={LucideUser}
                    label="Created By"
                    value={createdBy}
                />
                <InfoRow
                    icon={LucideUser}
                    label="Marked To"
                    value={markedTo}
                />
                <InfoRow
                    icon={LucideCalendar}
                    label="Created"
                    value={reference.createdAt ? format(new Date(reference.createdAt), 'MMM d, yyyy • h:mm a') : 'N/A'}
                />
                <InfoRow
                    icon={LucideCalendar}
                    label="Last Updated"
                    value={reference.updatedAt ? format(new Date(reference.updatedAt), 'MMM d, yyyy • h:mm a') : 'N/A'}
                />
                {reference.deliveryMode && (
                    <InfoRow
                        icon={LucideTag}
                        label="Delivery Mode"
                        value={reference.deliveryMode}
                    />
                )}
                {reference.eofficeNo && (
                    <InfoRow
                        icon={LucideFileText}
                        label="E-Office No."
                        value={reference.eofficeNo}
                    />
                )}
            </View>

            {/* Remarks */}
            {reference.remarks && (
                <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#ffffff', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 8 }}>Remarks</Text>
                    <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>{reference.remarks}</Text>
                </View>
            )}
        </ScrollView>
    );
};

export default ReferenceDetailsScreen;
