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

import { register } from '@services/modules/auth.service';

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
      router.push({
        pathname: '/otp-verification',
        params: { email: email.trim(), type: 'REGISTER' },
      } as any);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register');
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

            <Text className="text-[32px] font-bold text-black mb-6">Create account</Text>

            {/* Errors */}
            {error ? (
              <Text className="text-black font-semibold mb-4">{error}</Text>
            ) : null}

            {/* First name */}
            <Box className="mb-4">
              <Text className="text-black font-semibold mb-2">First name</Text>
              <Input className="border border-black rounded-none" size="md">
                <InputField
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#6B7280"
                  className="text-black px-3.5 py-3.5"
                />
              </Input>
            </Box>

            {/* Last name */}
            <Box className="mb-4">
              <Text className="text-black font-semibold mb-2">Last name</Text>
              <Input className="border border-black rounded-none" size="md">
                <InputField
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#6B7280"
                  className="text-black px-3.5 py-3.5"
                />
              </Input>
            </Box>

            {/* Email */}
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

            {/* Password */}
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

            {/* Confirm password */}
            <Box className="mb-4">
              <Text className="text-black font-semibold mb-2">Confirm password</Text>
              <Input className="border border-black rounded-none" size="md">
                <InputField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm password"
                  placeholderTextColor="#6B7280"
                  secureTextEntry
                  className="text-black px-3.5 py-3.5"
                />
              </Input>
            </Box>

            {/* Submit */}
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
                {isSubmitting ? 'Sending code...' : 'Sign up'}
              </Text>
            </Pressable>

            {/* Links */}
            <Pressable
              className="mt-5 items-center"
              onPress={() => router.push('/login')}
            >
              <Text className="text-black font-semibold">
                Already have an account? Sign in
              </Text>
            </Pressable>

          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}