import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@ui/button';
import { FormControl } from '@ui/form-control';
import { OTPInputMatrix } from '@ui/otp-input-matrix';
import { Spinner } from '@ui/spinner';
import { sendOtp, verifyOtp } from '@services/modules/auth.service';

const OTP_LENGTH = 6;

export default function OtpVerificationScreen() {
  const router = useRouter();
  const { email, type } = useLocalSearchParams<{
    email?: string;
    type?: 'REGISTER' | 'RESET';
  }>();

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message);
    }
  };

  useEffect(() => {
    if (!email || !type || (type !== 'REGISTER' && type !== 'RESET')) {
      router.replace('/login');
    }
  }, [email, type, router]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const code = digits.join('');

  const handleSubmit = async () => {
    setError(null);

    if (!email) {
      setError('Missing email address.');
      return;
    }

    if (code.length !== OTP_LENGTH) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtp(email, code, type as 'REGISTER' | 'RESET');

      if (type === 'REGISTER') {
        showToast('Account verified. Please sign in.');
        router.replace('/login');
      } else {
        router.push({ pathname: '/reset-password', params: { email, code } } as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || !type) {
      return;
    }

    setError(null);
    setIsResending(true);

    try {
      await sendOtp(email, type as 'REGISTER' | 'RESET');
      setSecondsLeft(60);
      showToast('A new code was sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code.');
    } finally {
      setIsResending(false);
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
            <Text style={styles.heading}>Verify code</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {email ?? 'your email'}.
            </Text>

            <FormControl style={styles.field} isInvalid={Boolean(error)}>
              <FormControl.Label style={styles.label}>Verification code</FormControl.Label>
              <OTPInputMatrix
                length={OTP_LENGTH}
                value={digits}
                onChangeValue={setDigits}
              />
              {error ? (
                <FormControl.Error style={styles.errorBox}>
                  <FormControl.Error.Text style={styles.errorText}>
                    {error}
                  </FormControl.Error.Text>
                </FormControl.Error>
              ) : null}
            </FormControl>

            <Button style={styles.button} disabled={isSubmitting} onPress={handleSubmit}>
              {isSubmitting ? (
                <Spinner color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify code</Text>
              )}
            </Button>

            <View style={styles.resendRow}>
              <Pressable onPress={handleResend} disabled={secondsLeft > 0 || isResending}>
                <Text
                  style={[styles.link, secondsLeft > 0 || isResending ? styles.linkDisabled : null]}
                >
                  {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
                </Text>
              </Pressable>
              {isResending ? <Spinner color="#FFFFFF" /> : null}
            </View>
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
    marginBottom: 12,
    color: '#000000',
  },
  subtitle: {
    color: '#000000',
    marginBottom: 24,
    lineHeight: 22,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    color: '#000000',
    fontWeight: '600',
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
  resendRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    color: '#000000',
    fontWeight: '600',
  },
  linkDisabled: {
    color: '#9CA3AF',
  },
  errorBox: {
    marginTop: 12,
  },
  errorText: {
    color: '#B91C1C',
  },
});
