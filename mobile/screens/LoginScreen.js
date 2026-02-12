import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/user.api';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const response = await loginUser({ email, password });
            if (response.success) {
                login(response.data.user, response.data.accessToken);
            } else {
                Alert.alert("Login Failed", response.message);
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 16 }}>
            <View style={{ width: '100%', maxWidth: 384, backgroundColor: '#ffffff', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#1f2937', marginBottom: 24 }}>Login</Text>

                <Text style={{ color: '#4b5563', marginBottom: 8 }}>Email</Text>
                <TextInput
                    style={{ width: '100%', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 16 }}
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <Text style={{ color: '#4b5563', marginBottom: 8 }}>Password</Text>
                <TextInput
                    style={{ width: '100%', backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 24 }}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity
                    style={{ width: '100%', backgroundColor: '#4f46e5', padding: 16, borderRadius: 8, alignItems: 'center' }}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>Sign In</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 16 }}>
                    <Text style={{ textAlign: 'center', color: '#4f46e5' }}>Don't have an account? Sign up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LoginScreen;
