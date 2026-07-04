import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type HintAction = 'chat' | 'edit' | 'dismiss';

type ProfileHintBubbleProps = {
  message: string;
  hasChatAction: boolean;
  hasEditAction: boolean;
  onAction: (action: HintAction) => void;
};

export function ProfileHintBubble({
  message,
  hasChatAction,
  hasEditAction,
  onAction,
}: ProfileHintBubbleProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !message) return null;

  const handleClose = () => {
    setDismissed(true);
    onAction('dismiss');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <View style={styles.tail} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>💡</Text>
            <Text style={styles.message}>{message}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color="#0369A1" />
            </TouchableOpacity>
          </View>
          <View style={styles.actions}>
            {hasChatAction ? (
              <TouchableOpacity
                style={[styles.cta, styles.ctaPrimary]}
                onPress={() => onAction('chat')}
                activeOpacity={0.85}>
                <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
                <Text style={styles.ctaTextPrimary}>Conversar com IA</Text>
              </TouchableOpacity>
            ) : null}
            {hasEditAction ? (
              <TouchableOpacity
                style={[styles.cta, styles.ctaSecondary]}
                onPress={() => onAction('edit')}
                activeOpacity={0.85}>
                <Ionicons name="create-outline" size={14} color="#0369A1" />
                <Text style={styles.ctaTextSecondary}>Editar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  bubble: {
    position: 'relative',
    backgroundColor: '#E7F7FF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    borderBottomWidth: 5,
    borderBottomColor: '#7DD3FC',
    padding: 14,
  },
  tail: {
    position: 'absolute',
    top: -8,
    left: 28,
    width: 16,
    height: 16,
    backgroundColor: '#E7F7FF',
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#BAE6FD',
    transform: [{ rotate: '45deg' }],
  },
  content: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emoji: {
    fontSize: 18,
  },
  message: {
    flex: 1,
    color: '#0369A1',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 18,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ctaPrimary: {
    backgroundColor: '#1CB0F6',
    borderBottomWidth: 3,
    borderBottomColor: '#1699D8',
  },
  ctaSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  ctaTextPrimary: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  ctaTextSecondary: {
    color: '#0369A1',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
