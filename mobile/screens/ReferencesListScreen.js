import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { getGlobalReferences, getLocalReferences } from '../services/reference.api';
import { LucideBookOpen, LucideChevronRight } from 'lucide-react-native';

const ReferencesListScreen = ({ navigation }) => {
    const [references, setReferences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('global');
    const isMounted = useRef(true);

    const fetchReferences = async () => {
        setLoading(true);
        try {
            let response;
            if (activeTab === 'global') {
                response = await getGlobalReferences();
            } else {
                response = await getLocalReferences();
            }

            console.log(`[References] ${activeTab} response:`, JSON.stringify(response).slice(0, 300));

            if (response.success && isMounted.current) {
                // API returns { data: { data: [...], pagination: {...} } }
                const refs = response.data?.data || response.data?.references || [];
                setReferences(Array.isArray(refs) ? refs : []);
            } else {
                console.warn(`[References] API error: ${response.message}`);
                if (isMounted.current) setReferences([]);
            }
        } catch (error) {
            console.error(`[References] Fetch error:`, error);
            if (isMounted.current) setReferences([]);
        }
        if (isMounted.current) {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        isMounted.current = true;
        fetchReferences();
        return () => { isMounted.current = false; };
    }, [activeTab]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchReferences();
    }, [activeTab]);

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
            onPress={() => navigation.navigate('ReferenceDetails', { reference: item })}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ backgroundColor: '#dbeafe', padding: 10, borderRadius: 20, marginRight: 12 }}>
                    <LucideBookOpen size={20} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: '#1f2937', fontSize: 15 }} numberOfLines={1}>
                        {item.subject || item.title || 'Untitled'}
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
                        {item.refId || ''} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                    </Text>
                </View>
            </View>
            <LucideChevronRight size={18} color="#9ca3af" />
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#f3f4f6', padding: 16 }}>
            {/* Tab Selector */}
            <View style={{ flexDirection: 'row', marginBottom: 16, backgroundColor: '#e5e7eb', borderRadius: 8, padding: 4 }}>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                        backgroundColor: activeTab === 'global' ? '#ffffff' : 'transparent',
                    }}
                    onPress={() => setActiveTab('global')}
                >
                    <Text style={{ color: activeTab === 'global' ? '#4f46e5' : '#6b7280', fontWeight: '600' }}>Global</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 6,
                        alignItems: 'center',
                        backgroundColor: activeTab === 'local' ? '#ffffff' : 'transparent',
                    }}
                    onPress={() => setActiveTab('local')}
                >
                    <Text style={{ color: activeTab === 'local' ? '#4f46e5' : '#6b7280', fontWeight: '600' }}>Local</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                </View>
            ) : (
                <FlatList
                    data={references}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
                            <LucideBookOpen size={48} color="#d1d5db" />
                            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 16 }}>No references found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

export default ReferencesListScreen;
