import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChunkyButton } from '@/components/chunky-button';
import { domain } from '@/types/domain';

type GiftDetailModalProps = {
  gift: domain.Gift | null;
  visible: boolean;
  onClose: () => void;
  onChat?: (gift: domain.Gift) => void;
};

export function GiftDetailModal({ gift, visible, onClose, onChat }: GiftDetailModalProps) {
  if (!gift) return null;

  const emoji = gift.type === 'outing' ? '🎟️' : '🎁';
  const iconBg = gift.type === 'outing' ? '#FFF4E6' : '#FFF4E6';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
              <Text style={styles.iconEmoji}>{emoji}</Text>
            </View>
            <View style={styles.headerRight}>
              {gift.type === 'outing' ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>Passeio</Text>
                </View>
              ) : null}
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#717182" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.body} bounces={false}>
            <Text style={styles.title}>{gift.title ?? 'Ideia de sugestão'}</Text>

            {gift.priceRange ? <Text style={styles.price}>{gift.priceRange}</Text> : null}

            {gift.occasionDetails ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>OCASIÃO</Text>
                <Text style={styles.sectionText}>{gift.occasionDetails}</Text>
              </View>
            ) : null}

            {gift.description ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DETALHES</Text>
                <Text style={styles.sectionText}>{gift.description}</Text>
              </View>
            ) : null}

            {gift.tags && gift.tags.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TAGS</Text>
                <View style={styles.tagsRow}>
                  {gift.tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {onChat ? (
            <ChunkyButton
              label="💬 Conversar com IA"
              onPress={() => onChat(gift)}
              variant="mini"
              color="#1CB0F6"
              shadowColor="#1699D8"
              style={styles.chatButton}
            />
          ) : null}
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
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 22,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FFF4E6',
  },
  typeBadgeText: {
    color: '#FF9600',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  body: {
    gap: 10,
  },
  title: {
    color: '#2D3436',
    fontSize: 20,
    fontFamily: 'Nunito_900Black',
  },
  price: {
    color: '#FF9600',
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    color: '#9AA3AD',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
  sectionText: {
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  tagText: {
    color: '#717182',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  chatButton: {
    marginTop: 8,
  },
});
