import { TextInput, View, type TextInputProps, type ViewProps } from 'react-native';
import { createInput } from '@gluestack-ui/core/input/creator';

const Input = createInput({
  Root: View,
  Icon: View,
  Slot: View,
  Input: TextInput,
});

export { Input };
