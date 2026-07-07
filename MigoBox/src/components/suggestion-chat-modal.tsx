import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiClient, ApiError } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { domain } from '@/types/domain';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type SuggestionChatModalProps = {
  gift: domain.Gift | null;
  visible: boolean;
  friendId: string;
  occasionDetails?: string;
  onClose: () => void;
  onFinalized: (updatedGift: domain.Gift) => void;
};

const QUICK_CHIPS = [
  'Quero algo mais barato',
  'Outro estilo ou ideia',
  'Mais detalhes sobre essa sugestão',
];

export function SuggestionChatModal({
  gift,
  visible,
  friendId,
  occasionDetails,
  onClose,
  onFinalized,
}: SuggestionChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finished, setFinished] = useState(false);
  const listRef = useRef<FlatList>(null);

  if (!gift) return null;

  const giftId = gift.giftID ?? '';
  const emoji = gift.type === 'outing' ? '🎟️' : '🎁';

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || finished || !giftId) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const result = await apiClient.suggestionAgentChat(
        giftId,
        trimmed,
        friendId,
        occasionDetails?.trim() || undefined,
      );
      const reply = (result.assistantMessage ?? '').trim();
      if (reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (error) {
      const apiError = error as ApiError;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: apiError.message ?? 'Erro ao comunicar com a IA.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleFinalize = async () => {
    if (!giftId || finalizing) return;
    setFinalizing(true);
    try {
      const result = await apiClient.suggestionAgentFinalize(giftId, friendId);
      if (result.gift) {
        onFinalized(result.gift);
      }
      setFinished(true);
    } catch (error) {
      const apiError = error as ApiError;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erro ao finalizar: ${apiError.message ?? 'Erro inesperado'}` },
      ]);
    } finally {
      setFinalizing(false);
    }
  };

  const handleClose = () => {
    setMessages([]);
    setInput('');
    setFinished(false);
    onClose();
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const ListEmpty = () => {
    if (messages.length > 0) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Converse com a IA</Text>
        <Text style={styles.emptySubtitle}>
          Refine esta sugestão conversando com o assistente. Pergunte por alternativas, ajustes de preço ou mais
          detalhes.
        </Text>
        <View style={styles.chipsRow}>
          {QUICK_CHIPS.map((chip) => (
            <Pressable
              key={chip}
              style={styles.chip}
              onPress={() => sendMessage(chip)}
              disabled={sending}>
              <Text style={styles.chipText}>{chip}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerEmoji}>{emoji}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {gift.title ?? 'Sugestão'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {finished ? null : (
              <ChunkyButton
                label={finalizing ? 'Salvando...' : 'Finalizar'}
                onPress={() => void handleFinalize()}
                variant="mini"
                loading={finalizing}
                color="#58CC02"
                shadowColor="#3F9A02"
              />
            )}
            <Pressable onPress={handleClose} style={styles.headerClose}>
              <Ionicons name="close" size={24} color="#2D3436" />
            </Pressable>
          </View>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          renderItem={renderMessage}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {finished ? (
          <View style={styles.finishedBar}>
            <Text style={styles.finishedText}>Sugestão finalizada com sucesso!</Text>
            <ChunkyButton label="Fechar" onPress={handleClose} variant="mini" color="#1CB0F6" shadowColor="#1699D8" />
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#9AA3AD"
              style={styles.input}
              multiline
              maxLength={1000}
              editable={!sending}
              onSubmitEditing={() => sendMessage(input)}
              blurOnSubmit
            />
            <ChunkyButton
              label={sending ? '' : 'Enviar'}
              onPress={() => sendMessage(input)}
              variant="mini"
              loading={sending}
              disabled={!input.trim() || sending}
              color="#1CB0F6"
              shadowColor="#1699D8"
              style={styles.sendButton}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_900Black',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  bubbleRow: {
    marginBottom: 12,
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubbleRowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#1CB0F6',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 19,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextAssistant: {
    color: '#2D3436',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  emptyTitle: {
    color: '#2D3436',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  chipText: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  sendButton: {
    marginBottom: 0,
  },
  finishedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#58CC02',
    backgroundColor: '#E6F9E6',
    gap: 12,
  },
  finishedText: {
    color: '#3F9A02',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
    flex: 1,
  },
});
