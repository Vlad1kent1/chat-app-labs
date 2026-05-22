import { useState, useEffect } from 'react';
import { Platform, ToastAndroid, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

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
    <Box className="flex-1 p-6 justify-center bg-white">

      {/* Header */}
      <Text className="text-[32px] font-bold text-black mb-3">Reset password</Text>
      <Text className="text-black leading-[22px] mb-6">
        Choose a new password for {email ?? 'your account'}.
      </Text>

      {/* New password */}
      <Box className="mb-4">
        <Text className="text-black font-semibold mb-2">New password</Text>
        <Input
          className={`border rounded-none ${error ? 'border-[#B91C1C]' : 'border-black'}`}
          size="md"
        >
          <InputField
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            className="text-black px-3.5 py-3.5"
          />
        </Input>
      </Box>

      {/* Confirm password */}
      <Box className="mb-6">
        <Text className="text-black font-semibold mb-2">Confirm password</Text>
        <Input
          className={`border rounded-none ${error ? 'border-[#B91C1C]' : 'border-black'}`}
          size="md"
        >
          <InputField
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            placeholderTextColor="#6B7280"
            secureTextEntry
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
          : <Text className="text-white font-bold">Update password</Text>
        }
      </Pressable>

    </Box>
  );
}
