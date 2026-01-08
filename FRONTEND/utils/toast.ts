import Toast from 'react-native-toast-message';

/**
 * Convenience utility for showing styled toast messages
 */
export const showToast = {
    success: (text1: string, text2?: string) => {
        Toast.show({
            type: 'success',
            text1,
            text2,
        });
    },
    error: (text1: string, text2?: string) => {
        Toast.show({
            type: 'error',
            text1,
            text2,
        });
    },
    tomato: (text1: string, uuid: string) => {
        Toast.show({
            type: 'tomatoToast',
            text1,
            props: { uuid }
        });
    }
};

export default showToast;
