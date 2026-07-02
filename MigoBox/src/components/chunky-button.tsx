import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { StyleProp } from 'react-native';

type ChunkyButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'fab';
  style?: StyleProp<ViewStyle>;
};

const COLORS = {
  cobalt: '#1CB0F6',
  cobaltShadow: '#1699D8',
  white: '#FFFFFF',
};

export function ChunkyButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
}: ChunkyButtonProps) {
  const isFab = variant === 'fab';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isFab ? styles.fab : styles.primary,
        pressed && !disabled && !loading ? styles.pressed : null,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={[styles.label, isFab ? styles.fabLabel : null]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: COLORS.cobalt,
    borderRadius: 20,
    borderBottomWidth: 6,
    borderBottomColor: COLORS.cobaltShadow,
  },
  primary: {
    width: '100%',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 5,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 24,
  },
  label: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },
  fabLabel: {
    fontSize: 30,
    lineHeight: 30,
    marginTop: -2,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    borderBottomWidth: 4,
  },
  disabled: {
    opacity: 0.75,
  },
});
