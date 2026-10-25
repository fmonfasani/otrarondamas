import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/types';

type SettingsScreenProps = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

const SettingsScreen: React.FC<SettingsScreenProps> = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [emailUpdates, setEmailUpdates] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSubtitle}>Receive order updates and promotions</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#81C784' }}
            thumbColor={notifications ? '#4CAF50' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Email Updates</Text>
            <Text style={styles.settingSubtitle}>Receive promotional emails</Text>
          </View>
          <Switch
            value={emailUpdates}
            onValueChange={setEmailUpdates}
            trackColor={{ false: '#767577', true: '#81C784' }}
            thumbColor={emailUpdates ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLabel}>
            <Text style={styles.settingTitle}>Dark Mode</Text>
            <Text style={styles.settingSubtitle}>Use dark theme throughout the app</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#767577', true: '#81C784' }}
            thumbColor={darkMode ? '#4CAF50' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Build Number</Text>
          <Text style={styles.infoValue}>1</Text>
        </View>

        <TouchableOpacity style={styles.linkItem}>
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem}>
          <Text style={styles.linkText}>Terms of Service</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem}>
          <Text style={styles.linkText}>Contact Support</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ by Wapsell</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  linkArrow: {
    fontSize: 18,
    color: '#ccc',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;
