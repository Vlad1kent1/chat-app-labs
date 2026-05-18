import { useState, useEffect } from 'react';
import { Text, TextInput, View, StyleSheet, Platform, ToastAndroid, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@ui/button';
import { FormControl } from '@ui/form-control';
import { Spinner } from '@ui/spinner';
import { resetPassword } from '@services/modules/auth.service';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();
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

  useEffect(() => {
    if (!email || !code) {
      router.replace({ pathname: '/forgot-password' } as any);
    }
  }, [email, code, router]);

  const handleSubmit = async () => {
    setError(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setError('Fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }

    if (!email || !code) {
      setError('Missing recovery details.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ email, code, password: password.trim() });
      showToast('Password updated successfully.');
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reset password</Text>
      <Text style={styles.subtitle}>Choose a new password for {email ?? 'your account'}.</Text>

      <FormControl style={styles.field} isInvalid={Boolean(error)}>
        <FormControl.Label style={styles.label}>New password</FormControl.Label>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          style={styles.input}
        />
      </FormControl>

      <FormControl style={styles.field} isInvalid={Boolean(error)}>
        <FormControl.Label style={styles.label}>Confirm password</FormControl.Label>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          style={styles.input}
        />
        {error ? (
          <FormControl.Error style={styles.errorBox}>
            <FormControl.Error.Text style={styles.errorText}>{error}</FormControl.Error.Text>
          </FormControl.Error>
        ) : null}
      </FormControl>

      <Button style={styles.button} disabled={isSubmitting} onPress={handleSubmit}>
        {isSubmitting ? <Spinner color="#FFFFFF" /> : <Text style={styles.buttonText}>Update password</Text>}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000000',
  },
  subtitle: {
    color: '#000000',
    marginBottom: 24,
    lineHeight: 22,
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
  errorBox: {
    marginTop: 8,
  },
  errorText: {
    color: '#B91C1C',
  },
});
