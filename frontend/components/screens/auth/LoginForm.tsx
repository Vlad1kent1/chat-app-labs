import { useState } from 'react';
import {
  Platform,
  ToastAndroid,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

import { loginUser } from '@store/slices/authSlice';
import { useAppDispatch } from '@store/hooks';

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

            {/* ── Заголовок ── */}
            <Text className="text-[32px] font-bold text-black mb-6">Sign in</Text>

            {/* ── Помилка ── */}
            {error ? (
              <Text className="text-black font-semibold mb-4">{error}</Text>
            ) : null}

            {/* ── Email ── */}
            <Box className="mb-4">
              <Text className="text-black font-semibold mb-2">Email</Text>
              <Input className="border border-black rounded-none" size="md">
                <InputField
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="text-black px-3.5 py-3.5"
                />
              </Input>
            </Box>

            {/* ── Password ── */}
            <Box className="mb-4">
              <Text className="text-black font-semibold mb-2">Password</Text>
              <Input className="border border-black rounded-none" size="md">
                <InputField
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                  className="text-black px-3.5 py-3.5"
                />
              </Input>
            </Box>

            {/* ── Submit ── */}
            <Pressable
              className={`py-4 items-center rounded-none ${
                isSubmitting ? 'bg-[#E5E7EB]' : 'bg-black'
              }`}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              <Text
                className={`font-bold ${isSubmitting ? 'text-[#9CA3AF]' : 'text-white'}`}
              >
                {isSubmitting ? 'Signing in...' : 'Log in'}
              </Text>
            </Pressable>

            {/* ── Links ── */}
            <Pressable
              className="mt-4 items-center"
              onPress={() => router.push('/forgot-password' as any)}
            >
              <Text className="text-black font-semibold">Forgot password?</Text>
            </Pressable>

            <Pressable
              className="mt-4 items-center"
              onPress={() => router.push('/register' as any)}
            >
              <Text className="text-black font-semibold">Create an account</Text>
            </Pressable>

          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
