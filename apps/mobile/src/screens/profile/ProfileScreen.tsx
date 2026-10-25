import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';
import { useAuthStore } from '@/stores/authStore';

type ProfileScreenProps = NativeStackScreenProps<ProfileStackParamList, 'ProfileScreen'>;

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>👤</Text>
        </View>
        <Text style={styles.userName}>{user?.nombre || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <Text style={styles.menuItemIcon}>📋</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Order History</Text>
            <Text style={styles.menuItemSubtitle}>View your past orders</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuItemIcon}>⚙️</Text>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemTitle}>Settings</Text>
            <Text style={styles.menuItemSubtitle}>Manage your preferences</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company Info</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Company ID</Text>
            <Text style={styles.infoValue}>{user?.empresaId}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.telefono || 'Not provided'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{user?.rol || 'CLIENTE'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Wapsell Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    fontSize: 40,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  infoBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;
