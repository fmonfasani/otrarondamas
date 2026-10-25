import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '@/types';

type SearchScreenProps = NativeStackScreenProps<HomeStackParamList, 'Search'>;

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Laptop',
    'Keyboard',
    'Mouse',
  ]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setRecentSearches([query, ...recentSearches.filter((s) => s !== query)].slice(0, 5));
      // Navigate to home with search query
      navigation.navigate('HomeScreen');
    }
  };

  const handleRecentSearch = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => handleSearch(searchQuery)}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {recentSearches.length > 0 && (
        <>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentSearches}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentItem}
                onPress={() => handleRecentSearch(item)}
              >
                <Text style={styles.recentItemText}>🔍 {item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => `${item}-${index}`}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  clearButton: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  recentItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentItemText: {
    fontSize: 14,
    color: '#333',
  },
});

export default SearchScreen;
