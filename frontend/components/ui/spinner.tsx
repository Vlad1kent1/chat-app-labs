import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';
import { createSpinner } from '@gluestack-ui/core/lib/esm/spinner/creator';

const Spinner = createSpinner<ActivityIndicatorProps>({
  Root: ActivityIndicator,
});

export { Spinner };
