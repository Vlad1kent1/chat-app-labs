import { Pressable, Text, View, type PressableProps, type ViewProps, type TextProps } from 'react-native';
import { createButton } from '@gluestack-ui/core/button/creator';

const Button = createButton<PressableProps, TextProps, ViewProps, ViewProps, ViewProps>({
  Root: Pressable,
  Text,
  Group: View,
  Spinner: View,
  Icon: View,
});

export { Button };
