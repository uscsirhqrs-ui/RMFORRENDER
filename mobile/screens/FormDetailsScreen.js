import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { getFormTemplate } from '../services/form.api';
import { format } from 'date-fns';

const FormDetailsScreen = ({ route, navigation }) => {
    const { formId } = route.params;
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFormDetails();
    }, []);

    const fetchFormDetails = async () => {
        const response = await getFormTemplate(formId);
        if (response.success) {
            setForm(response.data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    if (!form) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500">Form not found</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-2">{form.title}</Text>
            <Text className="text-gray-600 mb-4">{form.description}</Text>

            <View className="bg-gray-50 p-4 rounded-lg mb-4">
                <Text className="font-bold mb-2">Details</Text>
                <Text className="text-gray-600">Created By: {form.createdBy?.fullName || 'Unknown'}</Text>
                <Text className="text-gray-600">Created At: {format(new Date(form.createdAt), 'PPP')}</Text>
                <Text className="text-gray-600">Status: {form.status}</Text>
            </View>

            <Text className="font-bold mb-2 text-lg">Form Fields</Text>
            {/* Placeholder for form renderer */}
            {form.fields && form.fields.map((field, index) => (
                <View key={index} className="mb-4 bg-gray-50 p-3 rounded border border-gray-200">
                    <Text className="font-semibold">{field.label}</Text>
                    <Text className="text-gray-500 text-sm">Type: {field.type}</Text>
                </View>
            ))}
        </ScrollView>
    );
};

export default FormDetailsScreen;
