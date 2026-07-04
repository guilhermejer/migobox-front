import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/chunky-button';

type ConfirmDeleteModalProps = {
  visible: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDeleteModal({
  visible,
  title,
  message,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <Ionicons name="trash-outline" size={28} color="#D64545" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <ChunkyButton
              label="Não"
              onPress={onCancel}
              variant="mini"
              color="#1CB0F6"
              shadowColor="#1699D8"
              disabled={loading}
              style={styles.actionButton}
            />
            <ChunkyButton
              label="Sim, deletar"
              onPress={onConfirm}
              variant="mini"
              loading={loading}
              color="#D64545"
              shadowColor="#A53030"
              style={styles.actionButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#2D3436',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
  },
  message: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
});
