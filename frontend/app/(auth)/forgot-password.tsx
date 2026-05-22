import { useState } from 'react';
import { Platform, ToastAndroid, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

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
      router.push({
        pathname: '/otp-verification',
        params: { email: email.trim(), type: 'RESET' },
      } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send recovery email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="flex-1 p-6 justify-center bg-white">

      {/* Header */}
      <Text className="text-[32px] font-bold text-black mb-3">Forgot password</Text>
      <Text className="text-black leading-[22px] mb-6">
        Enter the email linked to your account.
      </Text>

      {/* Email поле */}
      <Box className="mb-4">
        <Text className="text-black font-semibold mb-2">Email</Text>
        <Input
          className={`border rounded-none ${error ? 'border-[#B91C1C]' : 'border-black'}`}
          size="md"
        >
          <InputField
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            className="text-black px-3.5 py-3.5"
          />
        </Input>
        {error ? (
          <Text className="text-[#B91C1C] text-sm mt-2">{error}</Text>
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
          : <Text className="text-white font-bold">Send code</Text>
        }
      </Pressable>

      {/* Link */}
      <Pressable className="mt-5 items-center" onPress={() => router.push('/login')}>
        <Text className="text-black font-semibold">Back to login</Text>
      </Pressable>

    </Box>
  );
}
