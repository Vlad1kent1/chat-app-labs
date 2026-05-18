import { Text, View, type TextProps, type ViewProps } from 'react-native';
import { createFormControl } from '@gluestack-ui/core/form-control/creator';

const FormControl = createFormControl<ViewProps, TextProps, TextProps, ViewProps, TextProps, TextProps, TextProps, TextProps, TextProps>({
  Root: View,
  Error: Text,
  ErrorText: Text,
  ErrorIcon: View,
  Label: Text,
  LabelText: Text,
  LabelAstrick: Text,
  Helper: Text,
  HelperText: Text,
});

export { FormControl };
