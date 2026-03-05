import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-provider';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)/schedule" />;
  }

  return <Redirect href="/(auth)/login" />;
}
