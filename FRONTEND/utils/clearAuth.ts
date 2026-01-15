import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Temporary function to clear auth data
export const clearAuthData = async () => {
    try {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        Alert.alert('Success', 'Auth data cleared. Please restart the app and login again.');
    } catch (error) {
        console.error('Error clearing auth data:', error);
    }
};

// Call this once from any screen:
// clearAuthData();
