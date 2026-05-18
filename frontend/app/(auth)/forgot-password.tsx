import { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, Platform, ToastAndroid, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@ui/button';
import { FormControl } from '@ui/form-control';
import { Spinner } from '@ui/spinner';
import { forgotPassword } from '@services/modules/auth.service';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
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
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await forgotPassword(email.trim());
      showToast('Verification code sent to your email.');
      router.push({ pathname: '/otp-verification', params: { email: email.trim(), type: 'RESET' } } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send recovery email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Forgot password</Text>
      <Text style={styles.subtitle}>Enter the email linked to your account.</Text>

      <FormControl style={styles.field} isInvalid={Boolean(error)}>
        <FormControl.Label style={styles.label}>Email</FormControl.Label>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#6B7280"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
        {error ? (
          <FormControl.Error style={styles.errorBox}>
            <FormControl.Error.Text style={styles.errorText}>{error}</FormControl.Error.Text>
          </FormControl.Error>
        ) : null}
      </FormControl>

      <Button style={styles.button} disabled={isSubmitting} onPress={handleSubmit}>
        {isSubmitting ? <Spinner color="#FFFFFF" /> : <Text style={styles.buttonText}>Send code</Text>}
      </Button>

      <Pressable onPress={() => router.push('/login')} style={styles.linkContainer}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
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
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: '#000000',
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 8,
  },
  errorText: {
    color: '#B91C1C',
  },
});
