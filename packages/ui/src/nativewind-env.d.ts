/**
 * Ambient type declarations for NativeWind's `className` prop.
 *
 * The real NativeWind package extends React Native's intrinsic component
 * types to accept `className`, but nativewind itself is only installed in
 * `apps/mobile`. When `packages/ui` is type-checked in isolation (e.g. CI
 * running `tsc --noEmit` per-package), the className prop is unknown.
 *
 * This file adds minimal ambient `className` support for all RN components
 * used by UI library source files, without depending on nativewind directly.
 */

import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface SwitchProps {
    className?: string;
  }
  interface FlatListProps<ItemT> {
    className?: string;
  }
}
