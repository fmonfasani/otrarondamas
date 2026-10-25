import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CartStackParamList, MetodoPago } from '@/types';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { apiService } from '@/services/apiService';

type CheckoutScreenProps = NativeStackScreenProps<CartStackParamList, 'Checkout'>;

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({ navigation }) => {
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('TRANSFERENCIA');
  const [isLoading, setIsLoading] = useState(false);

  const { items, totalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const handlePlaceOrder = async () => {
    if (!direccion || !ciudad) {
      Alert.alert('Error', 'Please fill in all address fields');
      return;
    }

    if (!user?.empresaId) {
      Alert.alert('Error', 'User information missing');
      return;
    }

    setIsLoading(true);
    try {
      // Create order via API
      const orderData = {
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        })),
        direccionEntrega: `${direccion}, ${ciudad}`,
        metodoPago,
        total: totalPrice,
        empresaId: user.empresaId,
      };

      const response = await apiService.post('/pedidos', orderData);
      const orderId = response.data.id;

      // Clear cart on success
      clearCart();

      // Navigate to confirmation
      navigation.navigate('OrderConfirmation', { orderId });
    } catch (error) {
      Alert.alert('Order Failed', error instanceof Error ? error.message : 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const paymentMethods: MetodoPago[] = ['EFECTIVO', 'TARJETA_CREDITO', 'TRANSFERENCIA'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items:</Text>
              <Text style={styles.summaryValue}>{items.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>${totalPrice.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>$0.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Street address"
              placeholderTextColor="#999"
              value={direccion}
              onChangeText={setDireccion}
              editable={!isLoading}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#999"
              value={ciudad}
              onChangeText={setCiudad}
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method}
              style={styles.radioOption}
              onPress={() => setMetodoPago(method)}
            >
              <View
                style={[
                  styles.radioButton,
                  metodoPago === method && styles.radioButtonSelected,
                ]}
              >
                {metodoPago === method && <View style={styles.radioButtonInner} />}
              </View>
              <Text style={styles.radioLabel}>{method.replace(/_/g, ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Place Order Button */}
        <TouchableOpacity
          style={[styles.placeOrderButton, isLoading && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={isLoading}
        >
          <Text style={styles.placeOrderButtonText}>
            {isLoading ? 'Placing Order...' : 'Place Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  radioLabel: {
    fontSize: 14,
    color: '#000',
  },
  placeOrderButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CheckoutScreen;
