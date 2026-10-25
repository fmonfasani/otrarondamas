import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, Product } from '@/types';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/stores/authStore';

type HomeScreenProps = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    if (!user?.empresaId) return;

    setIsLoading(true);
    try {
      const response = await apiService.get<Product[]>(
        `/productos?empresaId=${user.empresaId}`,
      );
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.nombre.toLowerCase().includes(query.toLowerCase()) ||
          product.descripcion?.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredProducts(filtered);
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <View style={styles.productImagePlaceholder}>
        <Text style={styles.imageText}>📦</Text>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={styles.productPrice}>${item.precio.toFixed(2)}</Text>
        <Text style={styles.productStock}>
          Stock: {item.stock > 0 ? item.stock : 'Out of stock'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#000',
    marginRight: 8,
  },
  searchButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageText: {
    fontSize: 48,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#999',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default HomeScreen;
