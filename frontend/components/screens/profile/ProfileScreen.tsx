import { Alert, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

import { useAppDispatch, useAppSelector } from '@store/hooks';
import { logout, updateUserProfile, deleteUserAccount } from '@store/slices/authSlice';
import { AvatarFallback } from '@ui/avatar-fallback';

interface EditFormData {
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const error = useAppSelector((state) => state.auth.error);

  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName || '',
        username: user.username,
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleEditFieldChange = (field: keyof EditFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!formData.firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return;
    }
    const username = formData.username.trim();
    if (!username) {
      Alert.alert('Validation Error', 'Username is required');
      return;
    }
    try {
      const resultAction = await dispatch(
        updateUserProfile({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim() || undefined,
          username,
          phone: formData.phone.trim() || undefined,
        }),
      );
      if (updateUserProfile.fulfilled.match(resultAction)) {
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditMode(false);
      } else if (updateUserProfile.rejected.match(resultAction)) {
        Alert.alert('Error', resultAction.payload || 'Failed to update profile');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const resultAction = await dispatch(deleteUserAccount());
              if (deleteUserAccount.fulfilled.match(resultAction)) {
                router.replace('/login');
              } else if (deleteUserAccount.rejected.match(resultAction)) {
                Alert.alert('Error', resultAction.payload || 'Failed to delete account');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred');
            }
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    try {
      const resultAction = await dispatch(logout());
      if (logout.fulfilled.match(resultAction)) router.replace('/login');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // ── No user ──────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <Box className="flex-1 bg-white p-4 gap-4">
        <Text className="text-[32px] font-bold text-black">Profile</Text>
        <Text className="text-base text-black">No user is currently signed in.</Text>
        <Pressable className="bg-black py-3 items-center" onPress={() => router.replace('/login')}>
          <Text className="text-white font-bold">Go to login</Text>
        </Pressable>
      </Box>
    );
  }

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (isEditMode) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-10">
            <Box className="flex-1 p-4 gap-4">

              <Box className="mt-2 mb-3">
                <Text className="text-[32px] font-bold text-black">Edit Profile</Text>
              </Box>

              {/* Error */}
              {error ? (
                <Box className="border border-black bg-white px-3 py-2">
                  <Text className="text-black text-sm font-bold">{error}</Text>
                </Box>
              ) : null}

              {/* Form */}
              <Box className="gap-4 my-3">

                <Box>
                  <Text className="text-sm font-bold text-black mb-1">First Name *</Text>
                  <Input className="border border-black rounded-none" size="md">
                    <InputField
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChangeText={(v) => handleEditFieldChange('firstName', v)}
                      editable={!isLoading}
                      className="text-black px-3 py-2.5"
                    />
                  </Input>
                </Box>

                <Box>
                  <Text className="text-sm font-bold text-black mb-1">Last Name</Text>
                  <Input className="border border-black rounded-none" size="md">
                    <InputField
                      placeholder="Enter last name (optional)"
                      value={formData.lastName}
                      onChangeText={(v) => handleEditFieldChange('lastName', v)}
                      editable={!isLoading}
                      className="text-black px-3 py-2.5"
                    />
                  </Input>
                </Box>

                <Box>
                  <Text className="text-sm font-bold text-black mb-1">Username *</Text>
                  <Input className="border border-black rounded-none" size="md">
                    <InputField
                      placeholder="Enter username"
                      value={formData.username}
                      onChangeText={(v) => handleEditFieldChange('username', v)}
                      editable={!isLoading}
                      className="text-black px-3 py-2.5"
                    />
                  </Input>
                </Box>

                <Box>
                  <Text className="text-sm font-bold text-black mb-1">Phone</Text>
                  <Input className="border border-black rounded-none" size="md">
                    <InputField
                      placeholder="Enter phone (optional)"
                      value={formData.phone}
                      onChangeText={(v) => handleEditFieldChange('phone', v)}
                      editable={!isLoading}
                      keyboardType="phone-pad"
                      className="text-black px-3 py-2.5"
                    />
                  </Input>
                </Box>
              </Box>

              {/* Buttons */}
              <Box className="gap-3 mt-3">
                <Pressable
                  className={`py-3 px-4 items-center justify-center ${isLoading ? 'bg-[#E5E7EB]' : 'bg-black'}`}
                  disabled={isLoading}
                  onPress={handleSaveProfile}
                >
                  {isLoading
                    ? <ActivityIndicator color="#FFFFFF" />
                    : <Text className="text-white font-bold text-sm">Save Changes</Text>
                  }
                </Pressable>
                <Pressable
                  className="py-3 px-4 items-center border border-black bg-white"
                  disabled={isLoading}
                  onPress={() => setIsEditMode(false)}
                >
                  <Text className="text-black font-bold text-sm">Cancel</Text>
                </Pressable>
              </Box>

            </Box>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-10">
        <Box className="flex-1 p-4 gap-4">

          {/* Header */}
          <Text className="text-[32px] font-bold text-black">My Profile</Text>

          {/* Avatar + status */}
          <Box className="flex-row items-center gap-3 mt-2 mb-3">
            <AvatarFallback
              avatarUrl={user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName as string}
              size="large"
            />
            <Box className="flex-col">
              <Text className="text-xs font-bold text-black">
                {user.isOnline ? 'Online' : 'Offline'}
              </Text>
              <Text className="text-[11px] text-black">
                Last seen: {new Date(user.lastSeen).toLocaleString()}
              </Text>
            </Box>
          </Box>

          {/* Profile card */}
          <Box className="bg-white border border-black p-4 my-2">
            <Box className="mb-3">
              <Text className="text-base font-semibold text-black">Profile Information</Text>
            </Box>

            <Box className="flex-row justify-between items-center py-2.5 border-b border-black">
              <Text className="text-sm font-bold text-black">Full Name</Text>
              <Text className="text-sm font-bold text-black text-right max-w-[60%]">
                {user.firstName} {user.lastName || ''}
              </Text>
            </Box>

            <Box className="flex-row justify-between items-center py-2.5 border-b border-black">
              <Text className="text-sm font-bold text-black">Email</Text>
              <Text className="text-sm font-bold text-black text-right max-w-[60%]">{user.email}</Text>
            </Box>

            <Box className="flex-row justify-between items-center py-2.5 border-b border-black">
              <Text className="text-sm font-bold text-black">Username</Text>
              <Text className="text-sm font-bold text-black text-right max-w-[60%]">{user.username}</Text>
            </Box>

            {user.phone ? (
              <Box className="flex-row justify-between items-center py-2.5 border-b border-black">
                <Text className="text-sm font-bold text-black">Phone</Text>
                <Text className="text-sm font-bold text-black text-right max-w-[60%]">{user.phone}</Text>
              </Box>
            ) : null}

            <Box className="flex-row justify-between items-center py-2.5 border-b border-black">
              <Text className="text-sm font-bold text-black">Member Since</Text>
              <Text className="text-sm font-bold text-black text-right max-w-[60%]">
                {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </Box>
          </Box>

          {/* Buttons */}
          <Box className="gap-3 mt-3">
            <Pressable
              className="bg-black py-3 px-4 items-center justify-center"
              onPress={() => setIsEditMode(true)}
              disabled={isLoading}
            >
              <Text className="text-white font-bold text-sm">Edit Profile</Text>
            </Pressable>

            <Pressable
              className={`py-3 px-4 items-center justify-center ${isLoading ? 'bg-[#E5E7EB]' : 'bg-black'}`}
              disabled={isLoading}
              onPress={handleLogout}
            >
              {isLoading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text className="text-white font-bold text-sm">Logout</Text>
              }
            </Pressable>

            <Pressable
              className="bg-black py-3 px-4 items-center justify-center"
              disabled={isLoading}
              onPress={handleDeleteAccount}
            >
              <Text className="text-white font-bold text-sm">Delete Account</Text>
            </Pressable>
          </Box>

        </Box>
      </ScrollView>
    </SafeAreaView>
  );
}
