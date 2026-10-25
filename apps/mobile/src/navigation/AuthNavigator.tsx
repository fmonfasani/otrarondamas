import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native';
import { AuthStackParamList } from '@/types';
import LoginScreen from '@/screens/auth/LoginScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackTitle: 'Back',
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: 'Create Account' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
