import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/Colors';

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 22,
  },
  eyebrow: {
    color: AppColors.secondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: AppColors.text,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  description: {
    color: AppColors.mutedText,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 760,
  },
});
