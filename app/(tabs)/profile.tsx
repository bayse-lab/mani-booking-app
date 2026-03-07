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
  Image,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-provider';
import { useCenters } from '@/hooks/use-centers';
import { useSubscription } from '@/hooks/use-subscription';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { centers } = useCenters();
  const {
    subscription,
    membershipTypes,
    loading: subLoading,
    actionLoading,
    subscribe,
    openPortal,
  } = useSubscription();
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

  // Email change
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

  const handleRequestDeletion = () => {
    Alert.alert(
      'Slet konto',
      'Dit abonnement løber til udgangen af næste måned. Du har stadig adgang til appen indtil da, hvorefter din konto og data slettes permanent.',
      [
        { text: 'Annuller', style: 'cancel' },
        {
          text: 'Anmod om sletning',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            const { error } = await supabase
              .from('profiles')
              .update({ deactivation_requested_at: new Date().toISOString() })
              .eq('id', user.id);
            if (error) {
              Alert.alert('Fejl', 'Kunne ikke anmode om sletning. Prøv igen.');
              return;
            }
            await refreshProfile();
            Alert.alert('Anmodning modtaget', 'Din konto vil blive slettet ved udgangen af næste måned.');
          },
        },
      ]
    );
  };

  const handleCancelDeletion = () => {
    Alert.alert(
      'Annuller sletning',
      'Vil du annullere din anmodning om kontosletning?',
      [
        { text: 'Nej', style: 'cancel' },
        {
          text: 'Ja, annuller sletning',
          onPress: async () => {
            if (!user) return;
            const { error } = await supabase
              .from('profiles')
              .update({ deactivation_requested_at: null })
              .eq('id', user.id);
            if (error) {
              Alert.alert('Fejl', 'Kunne ikke annullere. Prøv igen.');
              return;
            }
            await refreshProfile();
            Alert.alert('Annulleret', 'Din konto vil ikke blive slettet.');
          },
        },
      ]
    );
  };

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setShowEmailModal(false);
    setNewEmail('');
    Alert.alert(
      'Confirmation Sent',
      'A confirmation link has been sent to both your current and new email address. Please confirm both to complete the change.'
    );
  };

  const handlePickAvatar = async () => {
    if (!user) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      // Read file as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Convert blob to ArrayBuffer for Supabase upload
      const arrayBuffer = await new Response(blob).arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: asset.mimeType || `image/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        Alert.alert('Upload Failed', uploadError.message);
        setUploadingAvatar(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-buster to URL
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save to profile
      await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      await refreshProfile();
    } catch (err) {
      Alert.alert('Error', 'Failed to upload photo.');
      console.error('Avatar upload error:', err);
    }
    setUploadingAvatar(false);
  };

  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.7}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.full_name || profile.email)[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={Colors.textOnPrimary} />
            ) : (
              <Ionicons name="camera" size={14} color={Colors.textOnPrimary} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      {/* Membership Section */}
      <View style={styles.membershipSection}>
        <Text style={styles.sectionHeader}>Membership</Text>

        {subLoading ? (
          <View style={styles.membershipLoading}>
            <ActivityIndicator size="small" color={Colors.accent} />
          </View>
        ) : subscription ? (
          /* Active subscription card */
          <View style={styles.activePlanCard}>
            <View style={styles.activePlanHeader}>
              <View style={styles.activePlanBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.activePlanBadgeText}>
                  {subscription.status === 'admin_granted' ? 'Granted' : 'Active'}
                </Text>
              </View>
              {subscription.cancel_at_period_end && (
                <View style={styles.cancelBadge}>
                  <Text style={styles.cancelBadgeText}>Cancels at period end</Text>
                </View>
              )}
            </View>
            <Text style={styles.activePlanName}>
              {subscription.membership_types?.name || 'Membership'}
            </Text>
            {subscription.current_period_end && (
              <Text style={styles.activePlanRenewal}>
                {subscription.cancel_at_period_end ? 'Expires' : 'Renews'}{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('da-DK', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}
            {subscription.status !== 'admin_granted' && (
              <TouchableOpacity
                style={[styles.manageButton, actionLoading && styles.manageButtonDisabled]}
                onPress={openPortal}
                disabled={actionLoading}
              >
                <Ionicons name="settings-outline" size={16} color={Colors.primary} />
                <Text style={styles.manageButtonText}>
                  {actionLoading ? 'Opening...' : 'Manage Subscription'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : membershipTypes.length > 0 ? (
          /* Subscription options */
          <View style={styles.plansContainer}>
            {membershipTypes.map((type) => (
              <View key={type.id} style={styles.planCard}>
                <View style={styles.planCardContent}>
                  <Text style={styles.planName}>{type.name}</Text>
                  {type.description ? (
                    <Text style={styles.planDescription}>{type.description}</Text>
                  ) : null}
                  <Text style={styles.planPrice}>
                    {type.monthly_price_dkk != null
                      ? `${type.monthly_price_dkk} kr / month`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.subscribeButton, actionLoading && styles.subscribeButtonDisabled]}
                  onPress={() => type.stripe_price_id && subscribe(type.stripe_price_id)}
                  disabled={actionLoading || !type.stripe_price_id}
                >
                  <Text style={styles.subscribeButtonText}>
                    {actionLoading ? '...' : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noPlansText}>
            No membership plans available at this time.
          </Text>
        )}
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
        <TouchableOpacity
          style={styles.readOnlyInput}
          onPress={() => { setNewEmail(''); setShowEmailModal(true); }}
        >
          <Text style={styles.readOnlyText}>{profile.email}</Text>
          <Ionicons name="create-outline" size={16} color={Colors.textTertiary} />
        </TouchableOpacity>

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

      {/* Legal Links */}
      <View style={styles.legalContainer}>
        <TouchableOpacity
          style={styles.legalLink}
          onPress={() => Linking.openURL('https://bayse-lab.github.io/mani-booking-app/legal.html#privacy')}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.legalLinkText}>Privacy Policy</Text>
          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.legalLink}
          onPress={() => Linking.openURL('https://bayse-lab.github.io/mani-booking-app/legal.html#terms')}
        >
          <Ionicons name="document-text-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.legalLinkText}>Terms of Service</Text>
          <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      {profile.deactivation_requested_at ? (
        <View style={styles.deactivationNotice}>
          <Ionicons name="time-outline" size={20} color={Colors.warmGrey} />
          <Text style={styles.deactivationText}>
            Kontosletning anmodet. Din konto slettes ved udgangen af næste måned.
          </Text>
          <TouchableOpacity onPress={handleCancelDeletion}>
            <Text style={styles.cancelDeletionText}>Annuller sletning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.deleteButton} onPress={handleRequestDeletion}>
          <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
          <Text style={styles.deleteButtonText}>Slet konto</Text>
        </TouchableOpacity>
      )}

      {/* Email change modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowEmailModal(false)}
        >
          <View style={styles.pickerModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Change Email</Text>
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, fontFamily: 'Jost-Light' }}>
                A confirmation link will be sent to both your current and new email address.
              </Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="New email address"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              <TouchableOpacity
                style={[styles.saveButton, emailSaving && styles.saveButtonDisabled]}
                onPress={handleChangeEmail}
                disabled={emailSaving}
              >
                <Text style={styles.saveButtonText}>
                  {emailSaving ? 'Sending...' : 'Send Confirmation'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

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
    </KeyboardAvoidingView>
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 10,
    right: -4,
    backgroundColor: Colors.accent,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
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
  /* ─── Membership Section ─── */
  membershipSection: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  membershipLoading: {
    padding: 24,
    alignItems: 'center',
  },
  activePlanCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  activePlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  activePlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.sandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  activePlanBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelBadge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  cancelBadgeText: {
    fontSize: 11,
    color: Colors.warmGrey,
    fontFamily: 'Jost-Light',
  },
  activePlanName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'CormorantGaramond',
    marginBottom: 4,
  },
  activePlanRenewal: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'Jost-Light',
    marginBottom: 16,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.sandLight,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  manageButtonDisabled: {
    opacity: 0.5,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  plansContainer: {
    gap: 10,
    marginTop: 8,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planCardContent: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'CormorantGaramond',
  },
  planDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'Jost-Light',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
    fontFamily: 'Jost',
    marginTop: 4,
  },
  subscribeButton: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textOnAccent,
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noPlansText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: 'Jost-Light',
    textAlign: 'center',
    paddingVertical: 24,
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  readOnlyInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
    borderRadius: 12,
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
  legalContainer: {
    marginTop: 32,
    marginHorizontal: 24,
    gap: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  legalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  legalLinkText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 14,
  },
  deleteButtonText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'Jost-Light',
  },
  deactivationNotice: {
    marginTop: 24,
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 8,
  },
  deactivationText: {
    fontSize: 13,
    color: Colors.warmGrey,
    fontFamily: 'Jost-Light',
    textAlign: 'center',
    lineHeight: 20,
  },
  cancelDeletionText: {
    fontSize: 14,
    color: Colors.accent,
    fontFamily: 'Jost',
    fontWeight: '600',
    marginTop: 4,
  },
});
