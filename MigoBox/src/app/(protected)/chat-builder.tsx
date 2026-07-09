import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError } from '@/api/api-client';

const TAG_COLORS = ['#1CB0F6', '#58CC02', '#FF9600', '#A855F7', '#F43F5E', '#10B981'];

type ChatMessage = {
  id: string;
  text: string;
  isAI: boolean;
  time: string;
};

function nowLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function extractAiText(response: Record<string, unknown>): string {
  const message = response.assistantMessage;
  console.log('AI Response:', response);
  return typeof message === 'string' && message.trim().length > 0
    ? message
    : 'Entendi! Me conta mais sobre isso 💭';
}

export default function ChatBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId?: string; friendName?: string; avatar?: string }>();
  const friendId = params.friendId ?? '';
  const friendName = params.friendName || 'seu Migo';
  const avatar = params.avatar || '⭐';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: `Oi! Vamos conhecer melhor ${friendName}? Me conta o que essa pessoa mais gosta de fazer no tempo livre. 😊`,
      isAI: true,
      time: nowLabel(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !friendId) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      text: trimmed,
      isAI: false,
      time: nowLabel(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setFriendlyError(null);
    setIsSending(true);

    try {
      const response = await apiClient.agentChat(friendId, trimmed);
      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        text: extractAiText(response),
        isAI: true,
        time: nowLabel(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (Array.isArray(response.tags)) {
        setTags((prev) => Array.from(new Set([...prev, ...(response.tags as string[])])));
      }
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao conseguimos falar com a IA agora. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFinalize = async () => {
    if (!friendId || isFinalizing) return;

    setFriendlyError(null);
    setIsFinalizing(true);

    try {
      await apiClient.agentFinalize(friendId);
      router.replace({
        pathname: '/friend-profile',
        params: { friendId, friendName, avatar },
      } as never);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel finalizar o perfil agora.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#2D3436" />
          </TouchableOpacity>

          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarEmoji}>{avatar}</Text>
          </View>

          <View style={styles.headerTexts}>
            <Text style={styles.headerKicker}>Construindo perfil de</Text>
            <Text style={styles.headerName} numberOfLines={1}>{friendName}</Text>
          </View>

          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={() => void handleFinalize()}
            disabled={isFinalizing || !friendId}
            activeOpacity={0.8}>
            {isFinalizing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.finalizeButtonText}>Finalizar</Text>
            )}
          </TouchableOpacity>
        </View>

        {!friendId ? (
          <View style={styles.missingFriendBox}>
            <Text style={styles.error}>
              Nao encontramos o Migo para essa conversa. Volte e tente novamente.
            </Text>
          </View>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubbleRow, message.isAI ? styles.bubbleRowAI : styles.bubbleRowUser]}>
              {message.isAI ? (
                <View style={styles.aiAvatar}>
                  <Text style={styles.aiAvatarEmoji}>🤖</Text>
                </View>
              ) : null}
              <View style={[styles.bubble, message.isAI ? styles.bubbleAI : styles.bubbleUser]}>
                <Text style={message.isAI ? styles.bubbleTextAI : styles.bubbleTextUser}>
                  {message.text}
                </Text>
                <Text style={message.isAI ? styles.bubbleTimeAI : styles.bubbleTimeUser}>
                  {message.time}
                </Text>
              </View>
            </View>
          ))}

          {isSending ? (
            <View style={[styles.bubbleRow, styles.bubbleRowAI]}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarEmoji}>🤖</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                <Text style={styles.typingDots}>•••</Text>
              </View>
            </View>
          ) : null}

          {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}
        </ScrollView>

        {tags.length > 0 ? (
          <View style={styles.tagsStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsStripContent}>
              {tags.map((tag, index) => (
                <View
                  key={tag}
                  style={[styles.tagPill, { backgroundColor: TAG_COLORS[index % TAG_COLORS.length] + '22' }]}>
                  <Text style={[styles.tagPillText, { color: TAG_COLORS[index % TAG_COLORS.length] }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escreva sua mensagem..."
            placeholderTextColor="#9AA3AD"
            style={styles.input}
            multiline
            editable={!!friendId}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isSending || !friendId) && styles.sendButtonDisabled]}
            onPress={() => void handleSend()}
            disabled={!inputText.trim() || isSending || !friendId}
            activeOpacity={0.8}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f9f6f0',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E7F7FF',
    borderWidth: 2,
    borderColor: '#1CB0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 20,
  },
  headerTexts: {
    flex: 1,
  },
  headerKicker: {
    color: '#717182',
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  headerName: {
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  finalizeButton: {
    backgroundColor: '#58CC02',
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalizeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  missingFriendBox: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  messagesArea: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowAI: {
    justifyContent: 'flex-start',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarEmoji: {
    fontSize: 15,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  bubbleAI: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#1CB0F6',
    borderBottomRightRadius: 4,
  },
  bubbleTextAI: {
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 20,
  },
  bubbleTimeAI: {
    color: '#9AA3AD',
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    alignSelf: 'flex-end',
  },
  bubbleTimeUser: {
    color: '#E7F7FF',
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    alignSelf: 'flex-end',
  },
  typingBubble: {
    minWidth: 56,
    alignItems: 'center',
  },
  typingDots: {
    color: '#9AA3AD',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
    letterSpacing: 2,
  },
  tagsStrip: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
  },
  tagsStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagPillText: {
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f9f6f0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#1CB0F6',
    borderBottomWidth: 4,
    borderBottomColor: '#1699D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  error: {
    color: '#D64545',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
});
