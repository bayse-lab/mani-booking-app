import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-provider';
import { useCenters } from '@/hooks/use-centers';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { centers } = useCenters();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [centerId, setCenterId] = useState<string | null>(null);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const selectedCenter = centers.find((c) => c.id === centerId);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setBirthday(profile.birthday || '');
      setAddressLine1(profile.address_line1 || '');
      setAddressLine2(profile.address_line2 || '');
      setCity(profile.city || '');
      setPostalCode(profile.postal_code || '');
      setCenterId(profile.center_id || null);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const changed =
      fullName !== (profile.full_name || '') ||
      phone !== (profile.phone || '') ||
      birthday !== (profile.birthday || '') ||
      addressLine1 !== (profile.address_line1 || '') ||
      addressLine2 !== (profile.address_line2 || '') ||
      city !== (profile.city || '') ||
      postalCode !== (profile.postal_code || '') ||
      centerId !== (profile.center_id || null);
    setHasChanges(changed);
  }, [fullName, phone, birthday, addressLine1, addressLine2, city, postalCode, centerId, profile]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
        birthday: birthday.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        center_id: centerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save profile');
      return;
    }

    await refreshProfile();
    setHasChanges(false);
    Alert.alert('Saved', 'Profile updated successfully');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  };

  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar placeholder */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile.full_name || profile.email)[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* Personal Info */}
      <View style={styles.form}>
        <Text style={styles.sectionHeader}>Personal Information</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your full name"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+45 12 34 56 78"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Birthday</Text>
        <TextInput
          style={styles.input}
          value={birthday}
          onChangeText={setBirthday}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
          maxLength={10}
        />

        <Text style={styles.label}>Email</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{profile.email}</Text>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.textTertiary} />
        </View>

        <Text style={styles.label}>Studio</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowCenterPicker(true)}
        >
          <Text
            style={[
              styles.pickerButtonText,
              !selectedCenter && styles.pickerPlaceholder,
            ]}
          >
            {selectedCenter?.name || 'Select your studio'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Address Section */}
      <View style={styles.form}>
        <Text style={styles.sectionHeader}>Address</Text>

        <Text style={styles.label}>Address Line 1</Text>
        <TextInput
          style={styles.input}
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholder="Street address"
          placeholderTextColor={Colors.textTertiary}
        />

        <Text style={styles.label}>Address Line 2</Text>
        <TextInput
          style={styles.input}
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholder="Apt, suite, etc. (optional)"
          placeholderTextColor={Colors.textTertiary}
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>Postal Code</Text>
            <TextInput
              style={styles.input}
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="0000"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>
      </View>

      {/* Save Button */}
      {hasChanges && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Center picker modal */}
      <Modal
        visible={showCenterPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCenterPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowCenterPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select Studio</Text>
            <FlatList
              data={centers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    centerId === item.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setCenterId(item.id);
                    setShowCenterPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      centerId === item.id && styles.pickerItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {centerId === item.id && (
                    <Ionicons name="checkmark" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textOnPrimary,
    fontFamily: 'CormorantGaramond',
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Jost-Light',
  },
  form: {
    paddingHorizontal: 24,
    gap: 4,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 4,
    fontFamily: 'Jost',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 12,
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  readOnlyInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 2,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 16,
    color: Colors.textTertiary,
    fontFamily: 'Jost-Light',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  saveContainer: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 2,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pickerButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 2,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  pickerModal: {
    backgroundColor: Colors.surface,
    borderRadius: 2,
    paddingVertical: 16,
    maxHeight: 300,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'CormorantGaramond',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerItemActive: {
    backgroundColor: Colors.sandLight,
  },
  pickerItemText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  pickerItemTextActive: {
    fontWeight: '700',
    color: Colors.accent,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 40,
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.errorLight,
    backgroundColor: Colors.surface,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
