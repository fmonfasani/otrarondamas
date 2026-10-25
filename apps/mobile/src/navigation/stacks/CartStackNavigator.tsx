import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native';
import { CartStackParamList } from '@/types';
import CartScreen from '@/screens/cart/CartScreen';
import CheckoutScreen from '@/screens/cart/CheckoutScreen';
import OrderConfirmationScreen from '@/screens/cart/OrderConfirmationScreen';

const Stack = createNativeStackNavigator<CartStackParamList>();

const CartStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f5f5f5',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="CartScreen"
        component={CartScreen}
        options={{ title: 'Shopping Cart' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Checkout' }}
      />
      <Stack.Screen
        name="OrderConfirmation"
        component={OrderConfirmationScreen}
        options={{
          title: 'Order Confirmed',
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default CartStackNavigator;
