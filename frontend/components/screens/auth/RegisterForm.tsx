import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { register } from '@services/modules/auth.service';
import { Button } from '@ui/button';
import { FormControl } from '@ui/form-control';

export default function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (!firstName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Please fill in every field.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        email: email.trim(),
        password: password.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      showToast('Verification code sent to your email.');
      router.push({ pathname: '/otp-verification', params: { email: email.trim(), type: 'REGISTER' } } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register');
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
            <Text style={styles.heading}>Create account</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>First name</FormControl.Label>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </FormControl>
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Last name</FormControl.Label>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </FormControl>
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Email</FormControl.Label>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </FormControl>
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Password</FormControl.Label>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </FormControl>
            <FormControl style={styles.field}>
              <FormControl.Label style={styles.label}>Confirm password</FormControl.Label>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                secureTextEntry
                placeholderTextColor="#6B7280"
                style={styles.input}
              />
            </FormControl>

            <Button style={styles.button} disabled={isSubmitting} onPress={handleSubmit}>
              <Text style={styles.buttonText}>{isSubmitting ? 'Sending code...' : 'Sign up'}</Text>
            </Button>

            <Pressable onPress={() => router.push('/login')} style={styles.linkContainer}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
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
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#000000',
    fontWeight: '600',
  },
});
