import { useEffect, useState } from 'react';
import {
  Platform,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';

import { OTPInputMatrix } from '@ui/otp-input-matrix';
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
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((v) => v - 1);
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
        router.push({
          pathname: '/reset-password',
          params: { email, code },
        } as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email || !type) return;
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

  const resendDisabled = secondsLeft > 0 || isResending;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center"
          showsVerticalScrollIndicator={false}
        >
          <Box className="p-6 justify-center">

            {/* Header */}
            <Text className="text-[32px] font-bold text-black mb-3">Verify code</Text>
            <Text className="text-black leading-[22px] mb-6">
              Enter the 6-digit code sent to {email ?? 'your email'}.
            </Text>

            {/* OTP field */}
            <Box className="mb-6">
              <Text className="text-black font-semibold mb-2">Verification code</Text>
              <OTPInputMatrix
                length={OTP_LENGTH}
                value={digits}
                onChangeValue={setDigits}
              />
              {error ? (
                <Text className="text-[#B91C1C] text-sm mt-3">{error}</Text>
              ) : null}
            </Box>

            {/* Submit */}
            <Pressable
              className={`py-4 items-center justify-center rounded-none ${
                isSubmitting ? 'bg-[#E5E7EB]' : 'bg-black'
              }`}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text className="text-white font-bold">Verify code</Text>
              }
            </Pressable>

            {/* Resend row */}
            <Box className="mt-5 flex-row items-center justify-between">
              <Pressable onPress={handleResend} disabled={resendDisabled}>
                <Text
                  className={`font-semibold ${resendDisabled ? 'text-[#9CA3AF]' : 'text-black'}`}
                >
                  {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
                </Text>
              </Pressable>
              {isResending
                ? <ActivityIndicator size="small" color="#000000" />
                : null
              }
            </Box>

          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
