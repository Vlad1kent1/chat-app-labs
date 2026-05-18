import { useState } from 'react';
import { 
  Pressable, 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Platform, 
  ToastAndroid, 
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { loginUser } from '@store/slices/authSlice';
import { useAppDispatch } from '@store/hooks';
import { Button } from '@ui/button';
import { FormControl } from '@ui/form-control';

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const resultAction = await dispatch(
        loginUser({ email: trimmedEmail, password: trimmedPassword }),
      );

      const isFulfilled = loginUser.fulfilled.match(resultAction);
      const isRejected = loginUser.rejected.match(resultAction);

      if (isFulfilled) {
        router.replace('/(tabs)');
        return;
      }

      if (isRejected) {
        const actionPayload = (resultAction as any).payload;
        const actionError = (resultAction as any).error;
        const message =
          typeof actionPayload === 'string'
            ? actionPayload
            : actionError?.message ?? 'Unable to sign in';

        if (message.toLowerCase().includes('verify your email')) {
          router.replace({
            pathname: '/otp-verification',
            params: { email: trimmedEmail, type: 'REGISTER' },
          } as any);
          return;
        }

        setError(message);
        showToast(message);
      }
    } catch (err) {
      const errorObject = err as any;
      const message =
        typeof errorObject === 'string'
          ? errorObject
          : errorObject instanceof Error
          ? errorObject.message
          : 'Unable to sign in';

      setError(message);
      showToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <Text style={styles.heading}>Sign in</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Email</FormControl.Label>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#6B7280"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </FormControl>
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Password</FormControl.Label>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#6B7280"
                secureTextEntry
                style={styles.input}
              />
            </FormControl>
            <Button style={styles.button} disabled={isSubmitting} onPress={handleSubmit}>
              <Text style={styles.buttonText}>{isSubmitting ? 'Signing in...' : 'Log in'}</Text>
            </Button>

            <Pressable onPress={() => router.push('/forgot-password' as any)} style={styles.linkContainer}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/register' as any)} style={styles.linkContainer}>
              <Text style={styles.link}>Create an account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    padding: 24,
    justifyContent: 'center',
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    color: '#000000',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    color: '#000000',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#000000',
    color: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 0,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    marginBottom: 16,
    color: '#000000',
    fontWeight: '600',
  },
  linkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  link: {
    color: '#000000',
    fontWeight: '600',
  },
});
