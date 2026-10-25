import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList, Pedido } from '@/types';
import { apiService } from '@/services/apiService';

type OrderDetailScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  'OrderDetail'
>;

const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({ route }) => {
  const [order, setOrder] = useState<Pedido | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, []);

  const fetchOrderDetail = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<Pedido>(`/pedidos/${route.params.orderId}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return '#FF9500';
      case 'CONFIRMADO':
        return '#34C759';
      case 'ENTREGADO':
        return '#007AFF';
      case 'CANCELADO':
        return '#ff3b30';
      default:
        return '#999';
    }
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const renderOrderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>
          Product {item.productoId}
        </Text>
        <Text style={styles.itemQuantity}>Qty: {item.cantidad}</Text>
      </View>
      <Text style={styles.itemPrice}>${item.subtotal.toFixed(2)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Order Header */}
        <View style={styles.header}>
          <Text style={styles.orderNumber}>Order #{order.numero}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.estado) },
            ]}
          >
            <Text style={styles.statusText}>{order.estado}</Text>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>
              {new Date(order.fecha).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>{order.estado}</Text>
          </View>
          {order.observaciones && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.infoValue}>{order.observaciones}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <FlatList
            data={order.items}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>$0.00</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        {order.direccionEntrega && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>{order.direccionEntrega}</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#999',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    minWidth: 60,
    textAlign: 'right',
  },
  summaryBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#007AFF',
  },
  addressBox: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#000',
    lineHeight: 18,
  },
});

export default OrderDetailScreen;
