import { registerRootComponent } from 'expo';
import App from './App';
import { setTokenProvider } from '../shared/api/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize the token provider for the shared axios instance
setTokenProvider(async () => {
    return await AsyncStorage.getItem('accessToken');
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
