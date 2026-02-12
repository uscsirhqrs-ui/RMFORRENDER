import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LucideLayoutDashboard, LucideFileText, LucideBookOpen, LucideUser } from 'lucide-react-native';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FormsListScreen from './screens/FormsListScreen';
import FormDetailsScreen from './screens/FormDetailsScreen';
import ReferencesListScreen from './screens/ReferencesListScreen';
import ReferenceDetailsScreen from './screens/ReferenceDetailsScreen';
import ProfileScreen from './screens/ProfileScreen';
import UpdateReferenceScreen from './screens/UpdateReferenceScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ color, size }) => {
          let IconComponent;

          if (route.name === 'Home') {
            IconComponent = LucideLayoutDashboard;
          } else if (route.name === 'Forms') {
            IconComponent = LucideFileText;
          } else if (route.name === 'References') {
            IconComponent = LucideBookOpen;
          } else if (route.name === 'Profile') {
            IconComponent = LucideUser;
          }

          return <IconComponent color={color} size={size} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Forms" component={FormsListScreen} />
      <Tab.Screen name="References" component={ReferencesListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
    <ActivityIndicator size="large" color="#4f46e5" />
  </View>
);

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoading ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="FormDetails" component={FormDetailsScreen} options={{ headerShown: true, title: 'Form Details' }} />
          <Stack.Screen name="ReferenceDetails" component={ReferenceDetailsScreen} options={{ headerShown: true, title: 'Reference Details' }} />
          <Stack.Screen name="UpdateReference" component={UpdateReferenceScreen} options={{ headerShown: true, title: 'Update Reference' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
