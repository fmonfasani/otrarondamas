import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native';
import { HomeStackParamList } from '@/types';
import HomeScreen from '@/screens/home/HomeScreen';
import ProductDetailScreen from '@/screens/home/ProductDetailScreen';
import SearchScreen from '@/screens/home/SearchScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

const HomeStackNavigator: React.FC = () => {
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
        name="HomeScreen"
        component={HomeScreen}
        options={{ title: 'Products' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={({ route }) => ({
          title: route.params.productId,
        })}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search Products' }}
      />
    </Stack.Navigator>
  );
};

export default HomeStackNavigator;
