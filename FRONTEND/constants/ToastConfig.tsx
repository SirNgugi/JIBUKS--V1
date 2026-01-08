import React from 'react';
import { View, Text } from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

export const toastConfig: ToastConfig = {
    /*
      Overwrite 'success' type,
      by modifying the existing `BaseToast` component
    */
    success: (props) => (
        <BaseToast
            {...props}
            style={{ borderLeftColor: '#1e3a8a' }}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            text1Style={{
                fontSize: 15,
                fontWeight: '400'
            }}
        />
    ),
    /*
      Overwrite 'error' type,
      by modifying the existing `ErrorToast` component
    */
    error: (props) => (
        <ErrorToast
            {...props}
            style={{ borderLeftColor: '#ef4444' }}
            text1Style={{
                fontSize: 17
            }}
            text2Style={{
                fontSize: 15
            }}
        />
    ),
    /*
      Or create a completely new type - `tomatoToast`,
      building the layout from scratch.
    */
    tomatoToast: ({ text1, props }: any) => (
        <View style={{ height: 60, width: '100%', backgroundColor: 'tomato', padding: 10, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>{text1}</Text>
            <Text style={{ color: 'white' }}>{props.uuid}</Text>
        </View>
    )
};
