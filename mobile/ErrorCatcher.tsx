import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import App from './App';

export default function ErrorCatcher() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Intercept global errors
    const defaultHandler = (global as any).ErrorUtils.getGlobalHandler();
    
    (global as any).ErrorUtils.setGlobalHandler((err: any, isFatal: boolean) => {
      setError(`Fatal: ${isFatal}\nMessage: ${err.message}\nStack: ${err.stack}`);
    });

    // Also catch unhandled promise rejections
    try {
      const rejectionTracker = require('promise/setimmediate/rejection-tracking');
      rejectionTracker.enable({
        allRejections: true,
        onUnhandled: (id: string, err: any) => {
          setError(`Unhandled Promise Rejection:\nMessage: ${err?.message || err}\nStack: ${err?.stack || ''}`);
        },
        onHandled: () => {},
      });
    } catch (e) {}
  }, []);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#7f1d1d' }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 16 }}>
            App Crashed!
          </Text>
          <Text style={{ color: 'white', fontSize: 14, marginBottom: 24 }}>
            Please take a screenshot of this error and show it to the developer.
          </Text>
          <View style={{ backgroundColor: 'black', padding: 16, borderRadius: 8 }}>
            <Text style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 12 }}>
              {error}
            </Text>
          </View>
          <TouchableOpacity 
            style={{ marginTop: 24, backgroundColor: 'white', padding: 12, borderRadius: 8, alignItems: 'center' }}
            onPress={() => setError(null)}
          >
            <Text style={{ color: '#7f1d1d', fontWeight: 'bold' }}>Dismiss & Try Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <App />;
}
