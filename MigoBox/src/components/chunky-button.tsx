import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { StyleProp } from 'react-native';

type ChunkyButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'fab' | 'mini';
  style?: StyleProp<ViewStyle>;
  color?: string;
  shadowColor?: string;
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
  color,
  shadowColor,
}: ChunkyButtonProps) {
  const isFab = variant === 'fab';
  const isMini = variant === 'mini';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isFab ? styles.fab : isMini ? styles.mini : styles.primary,
        color ? { backgroundColor: color } : null,
        shadowColor ? { borderBottomColor: shadowColor } : null,
        pressed && !disabled && !loading ? styles.pressed : null,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={COLORS.white} size={isMini ? 'small' : 'large'} />
        ) : (
          <Text style={[styles.label, isFab ? styles.fabLabel : isMini ? styles.miniLabel : null]}>
            {label}
          </Text>
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
  mini: {
    borderRadius: 14,
    borderBottomWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  miniLabel: {
    fontSize: 14,
  },
  pressed: {
    transform: [{ translateY: 1 }],
    borderBottomWidth: 4,
  },
  disabled: {
    opacity: 0.75,
  },
});
