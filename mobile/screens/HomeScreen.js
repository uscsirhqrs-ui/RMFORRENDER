import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { LucideFileText, LucideBookOpen, LucideBell } from 'lucide-react-native';

const DashboardCard = ({ title, count, icon, borderColor, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            backgroundColor: '#ffffff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            borderLeftWidth: 4,
            borderLeftColor: borderColor,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        }}
    >
        <View style={{ padding: 10, borderRadius: 20, backgroundColor: '#f0f0ff', marginRight: 16 }}>
            {icon}
        </View>
        <View>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{title}</Text>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1f2937' }}>{count}</Text>
        </View>
    </TouchableOpacity>
);

const HomeScreen = ({ navigation }) => {
    const { user } = useAuth();

    return (
        <ScrollView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            {/* Header */}
            <View style={{ backgroundColor: '#ffffff', padding: 24, paddingBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>Welcome back,</Text>
                        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1f2937' }}>{user?.fullName?.split(' ')[0]}</Text>
                    </View>
                    <TouchableOpacity style={{ backgroundColor: '#f3f4f6', padding: 8, borderRadius: 20 }}>
                        <LucideBell size={24} color="#6b7280" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Dashboard Content */}
            <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 }}>Overview</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <View style={{ width: '48%' }}>
                        <DashboardCard
                            title="Forms to Fill"
                            count="3"
                            icon={<LucideFileText size={24} color="#6366f1" />}
                            borderColor="#6366f1"
                            onPress={() => navigation.navigate('Forms')}
                        />
                    </View>
                    <View style={{ width: '48%' }}>
                        <DashboardCard
                            title="Pending"
                            count="1"
                            icon={<LucideFileText size={24} color="#eab308" />}
                            borderColor="#eab308"
                            onPress={() => navigation.navigate('Forms')}
                        />
                    </View>
                    <View style={{ width: '100%' }}>
                        <DashboardCard
                            title="References"
                            count="12"
                            icon={<LucideBookOpen size={24} color="#10b981" />}
                            borderColor="#10b981"
                            onPress={() => navigation.navigate('References')}
                        />
                    </View>
                </View>

                {/* Recent Activity */}
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8, marginTop: 16 }}>Recent Activity</Text>
                <View style={{ backgroundColor: '#ffffff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
                    <Text style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>No recent activity</Text>
                </View>
            </View>
        </ScrollView>
    );
};

export default HomeScreen;
