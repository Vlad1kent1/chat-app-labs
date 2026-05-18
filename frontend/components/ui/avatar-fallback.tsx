import { View, Text, StyleSheet, Image } from 'react-native';

interface AvatarFallbackProps {
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  chatName?: string;
  size?: 'small' | 'medium' | 'large';
  onImageError?: () => void;
}

export function AvatarFallback({
  avatarUrl,
  firstName = '',
  lastName = '',
  chatName = '',
  size = 'medium',
  onImageError,
}: AvatarFallbackProps) {
  const getInitials = (): string => {
    if (chatName && chatName.trim().length > 0) {
      return chatName.trim().slice(0, 2).toUpperCase();
    }

    const f = firstName?.trim()?.charAt(0) ?? '';
    const l = lastName?.trim()?.charAt(0) ?? '';
    const combined = (f + l).toUpperCase();
    return combined || '??';
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          width: 40,
          height: 40,
          fontSize: 14,
        };
      case 'large':
        return {
          width: 120,
          height: 120,
          fontSize: 36,
        };
      case 'medium':
      default:
        return {
          width: 64,
          height: 64,
          fontSize: 24,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // If avatarUrl exists, try to load the image
  if (avatarUrl) {
    return (
      <View
        style={[
          styles.container,
          {
            width: sizeStyles.width,
            height: sizeStyles.height,
            borderRadius: 0,
          },
        ]}
      >
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 0,
          }}
          onError={onImageError}
        />
      </View>
    );
  }

  // Fallback to initials avatar
  return (
    <View
      style={[
          styles.fallbackContainer,
          {
            width: sizeStyles.width,
            height: sizeStyles.height,
            borderRadius: 0,
          },
        ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {getInitials()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
  },
  initialsText: {
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
