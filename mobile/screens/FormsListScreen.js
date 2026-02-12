import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { getSharedWithMeForms } from '../services/form.api';
import { format } from 'date-fns';
import { LucideFileText, LucideChevronRight } from 'lucide-react-native';

const FormsListScreen = ({ navigation }) => {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchForms = async () => {
        try {
            const response = await getSharedWithMeForms();
            if (response.success) {
                setForms(response.data.forms || response.data || []);
            }
        } catch (error) {
            console.error('[Forms] Fetch error:', error);
        }
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchForms();
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={{
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
            }}
            onPress={() => navigation.navigate('FormDetails', { formId: item._id })}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ backgroundColor: '#e0e7ff', padding: 10, borderRadius: 20, marginRight: 12 }}>
                    <LucideFileText size={20} color="#4f46e5" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#1f2937', fontSize: 15 }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                        {item.createdBy?.fullName} • {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </Text>
                </View>
            </View>
            <LucideChevronRight size={20} color="#9ca3af" />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#4f46e5" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>Shared With Me</Text>
            <FlatList
                data={forms}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 80 }}>
                        <LucideFileText size={48} color="#d1d5db" />
                        <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 16 }}>No forms found</Text>
                    </View>
                }
            />
        </View>
    );
};

export default FormsListScreen;
