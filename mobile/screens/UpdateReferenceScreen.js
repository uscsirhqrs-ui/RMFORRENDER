import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { updateGlobalReference, updateLocalReference } from '../services/reference.api';

const STATUSES = ['Open', 'In Progress', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const OptionPicker = ({ label, options, selected, onSelect }) => (
    <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: '600' }}>{label}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {options.map(opt => {
                const isSelected = selected === opt;
                return (
                    <TouchableOpacity
                        key={opt}
                        onPress={() => onSelect(opt)}
                        style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#4f46e5' : '#e5e7eb',
                            backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                        }}
                    >
                        <Text style={{
                            color: isSelected ? '#4f46e5' : '#6b7280',
                            fontWeight: isSelected ? '700' : '500',
                            fontSize: 14,
                        }}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const UpdateReferenceScreen = ({ route, navigation }) => {
    const { reference, refType } = route.params;

    const [remarks, setRemarks] = useState('');
    const [status, setStatus] = useState(reference.status || 'Open');
    const [priority, setPriority] = useState(reference.priority || 'Medium');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        if (!remarks.trim()) {
            Alert.alert('Required', 'Please enter remarks before updating.');
            return;
        }

        setLoading(true);
        try {
            const updateData = {
                remarks: remarks.trim(),
                status,
                priority,
                // Keep current markedTo for now (full reassignment requires user picker)
                markedTo: Array.isArray(reference.markedTo) ? reference.markedTo[0] : reference.markedTo,
            };

            const response = refType === 'global'
                ? await updateGlobalReference(reference._id, updateData)
                : await updateLocalReference(reference._id, updateData);

            if (response.success) {
                Alert.alert('Success', 'Reference updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                Alert.alert('Error', response.message || 'Failed to update reference');
            }
        } catch (error) {
            console.error('[UpdateRef] Error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        }
        setLoading(false);
    };

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 16 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{reference.refId}</Text>
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginTop: 2 }}>{reference.subject}</Text>
            </View>

            {/* Form */}
            <View style={{ margin: 16, backgroundColor: '#ffffff', borderRadius: 12, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
                {/* Remarks */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: '600' }}>
                        Remarks <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <TextInput
                        style={{
                            borderWidth: 1,
                            borderColor: '#d1d5db',
                            borderRadius: 8,
                            padding: 12,
                            fontSize: 14,
                            minHeight: 100,
                            textAlignVertical: 'top',
                            backgroundColor: '#f9fafb',
                        }}
                        placeholder="Enter remarks for this update..."
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Status Picker */}
                <OptionPicker
                    label="Status"
                    options={STATUSES}
                    selected={status}
                    onSelect={setStatus}
                />

                {/* Priority Picker */}
                <OptionPicker
                    label="Priority"
                    options={PRIORITIES}
                    selected={priority}
                    onSelect={setPriority}
                />

                {/* Current Assignment Info */}
                <View style={{ backgroundColor: '#f0fdf4', padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#bbf7d0' }}>
                    <Text style={{ color: '#166534', fontSize: 12, fontWeight: '600' }}>Currently Marked To</Text>
                    <Text style={{ color: '#15803d', fontSize: 13, marginTop: 4 }}>
                        {Array.isArray(reference.markedToDetails)
                            ? reference.markedToDetails.map(u => u.fullName || u.email).join(', ')
                            : reference.markedToDetails?.fullName || 'N/A'
                        }
                    </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={{
                        backgroundColor: loading ? '#a5b4fc' : '#4f46e5',
                        paddingVertical: 16,
                        borderRadius: 10,
                        alignItems: 'center',
                    }}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>SUBMIT UPDATE</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

export default UpdateReferenceScreen;
