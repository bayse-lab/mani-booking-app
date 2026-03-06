import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-provider';
import { useCenters } from '@/hooks/use-centers';
import { Colors } from '@/constants/colors';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const { centers } = useCenters();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [centerId, setCenterId] = useState<string | null>(null);
  const [showCenterPicker, setShowCenterPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedCenter = centers.find((c) => c.id === centerId);

  const handleSignUp = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      centerId || undefined
    );
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Maní</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor={Colors.textTertiary}
            secureTextEntry
          />

          <Text style={styles.label}>Studio</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCenterPicker(true)}
          >
            <Text
              style={[
                styles.pickerText,
                !selectedCenter && styles.pickerPlaceholder,
              ]}
            >
              {selectedCenter?.name || 'Select your studio'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>

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
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.accent}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  brand: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 8,
    fontFamily: 'CormorantGaramond',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    fontFamily: 'Jost-Light',
  },
  form: {
    gap: 4,
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
  pickerText: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'Jost-Light',
  },
  pickerPlaceholder: {
    color: Colors.textTertiary,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.textOnAccent,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Jost',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontFamily: 'Jost-Light',
  },
  link: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Jost',
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
});
