import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, Product } from '@/types';
import { apiService } from '@/services/apiService';
import { useCartStore } from '@/stores/cartStore';

type ProductDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ route }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const { addItem } = useCartStore();

  useEffect(() => {
    fetchProductDetail();
  }, []);

  const fetchProductDetail = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<Product>(`/productos/${route.params.productId}`);
      setProduct(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    addItem(product, quantity);
    Alert.alert('Success', `Added ${quantity} item(s) to cart`);
    setQuantity(1);
  };

  const handleIncreaseQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (isLoading || !product) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isOutOfStock = product.stock === 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageText}>📦</Text>
        </View>
        {isOutOfStock && <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        </View>}
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{product.nombre}</Text>
        <Text style={styles.price}>${product.precio.toFixed(2)}</Text>

        {product.descripcion && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.descripcion}</Text>
          </>
        )}

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock:</Text>
            <Text style={styles.detailValue}>{product.stock} units</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Minimum Stock:</Text>
            <Text style={styles.detailValue}>{product.stockMinimo} units</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID:</Text>
            <Text style={styles.detailValue}>{product.id}</Text>
          </View>
        </View>

        {!isOutOfStock && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleDecreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityDisplay}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={handleIncreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addToCartButton, isOutOfStock && styles.disabledButton]}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Text style={styles.addToCartButtonText}>
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 80,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    marginTop: 20,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  detailsSection: {
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  quantitySection: {
    marginTop: 20,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    width: '50%',
  },
  quantityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  quantityDisplay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  disabledButton: {
    opacity: 0.5,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductDetailScreen;
