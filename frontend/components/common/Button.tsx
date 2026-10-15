import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';

import { AppColors, AppRadius } from '@/constants/Colors';

type ButtonProps = {
  label: string;
  href?: Href;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, href, onPress, variant = 'primary' }: ButtonProps) {
  const content = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        {content}
      </Link>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: AppRadius.control,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: AppColors.softPurple,
    borderColor: '#D8CBFF',
    borderWidth: 1,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: AppColors.secondary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
