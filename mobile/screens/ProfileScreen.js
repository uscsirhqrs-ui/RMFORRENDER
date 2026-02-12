import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = () => {
    const { user, logout } = useAuth();

    const initials = user?.fullName
        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
        : '?';

    return (
        <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 16 }}>
            <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
                <View style={{
                    width: 96, height: 96,
                    backgroundColor: '#e0e7ff',
                    borderRadius: 48,
                    justifyContent: 'center', alignItems: 'center',
                    marginBottom: 16
                }}>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#4f46e5' }}>{initials}</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1f2937' }}>{user?.fullName}</Text>
                <Text style={{ color: '#6b7280', marginTop: 4 }}>{user?.email}</Text>
                <Text style={{ color: '#6b7280', marginTop: 4 }}>{user?.designation}</Text>
                <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 }}>
                    <Text style={{ color: '#4f46e5', fontSize: 12, fontWeight: 'bold' }}>{user?.role}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={{
                    backgroundColor: '#ef4444',
                    padding: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                }}
                onPress={logout}
            >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

export default ProfileScreen;
