import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '@/navigation/RootNavigator';

const App: React.FC = () => {
  useEffect(() => {
    // Perform initialization tasks here
    // - Load stored auth
    // - Initialize analytics
    // - Setup error tracking
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
};

export default App;
