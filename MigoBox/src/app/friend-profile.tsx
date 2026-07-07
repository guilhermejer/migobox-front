import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError, DEFAULT_PROFILE_PHOTO_CONTENT_TYPE, ProfilePhotoSignedUrlRequest } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { ConfirmDeleteModal } from '@/components/confirm-delete-modal';
import { GiftDetailModal } from '@/components/gift-detail-modal';
import { ProfileHintBubble } from '@/components/profile-hint-bubble';
import { ReminderFormModal } from '@/components/reminder-form-modal';
import { SuggestionChatModal } from '@/components/suggestion-chat-modal';
import { useUserContext } from '@/context/user-context';
import { domain } from '@/types/domain';
import { buildHintMessage, calcProfileProgress, profileGaps } from '@/utils/profile';

const TAG_COLORS = ['#1CB0F6', '#58CC02', '#FF9600', '#A855F7', '#F43F5E', '#10B981'];
const BUDGET_OPTIONS = [
  { key: 'ate100', label: 'Até R$100', value: 'Até R$100' },
  { key: '100-200', label: 'R$100 à R$200', value: 'R$100 à R$200' },
  { key: '200-500', label: 'R$200 à R$500', value: 'R$200 à R$500' },
  { key: 'outro', label: 'Outro', value: null },
] as const;

type TagFilter = 'all' | 'like' | 'dislike' | 'trait';
type TagItem = { label: string; type: 'like' | 'dislike' | 'trait' };

const OCCASION_META: { value: string; label: string; emoji: string }[] = [
  { value: 'birthday', label: 'Aniversário', emoji: '🎂' },
  { value: 'anniversary', label: 'Aniv. de casamento', emoji: '💍' },
  { value: 'holiday', label: 'Data festiva', emoji: '🎉' },
  { value: 'christmas', label: 'Natal', emoji: '🎄' },
  { value: 'valentines', label: 'Namorados', emoji: '💌' },
  { value: 'mothers_day', label: 'Dia das Mães', emoji: '🌷' },
  { value: 'fathers_day', label: 'Dia dos Pais', emoji: '🧔' },
];

const RECURRENCE_META: Record<domain.ReminderRecurrence, string> = {
  none: 'Único',
  yearly: 'Anual',
  monthly: 'Mensal',
  weekly: 'Semanal',
  daily: 'Diário',
};

function occasionMeta(type?: string): { label: string; emoji: string } {
  const known = OCCASION_META.find((option) => option.value === type);
  if (known) return { label: known.label, emoji: known.emoji };
  return { label: type && type.trim().length > 0 ? type : 'Lembrete', emoji: '⭐' };
}

function formatDisplayDate(value?: string): string {
  if (!value) return '';
  const iso = value.length >= 10 ? value.slice(0, 10) : value;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function calcAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const years = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  return `${years} anos`;
}

type TagPalette = { background: string; text: string };

function tagPalette(type: TagItem['type']): TagPalette {
  if (type === 'like') return { background: '#D1FAE5', text: '#065F46' };
  if (type === 'dislike') return { background: '#FFE4E6', text: '#9F1239' };
  return { background: '#E0E7FF', text: '#3730A3' };
}

export default function FriendProfileScreen() {
  const router = useRouter();
  const { user } = useUserContext();
  const params = useLocalSearchParams<{ friendId?: string; friendName?: string; avatar?: string }>();
  const friendId = params.friendId ?? '';

  const [friend, setFriend] = useState<domain.Friend | null>(
    friendId ? { friendID: friendId, name: params.friendName, avatar: params.avatar } : null,
  );
  const [profile, setProfile] = useState<domain.Profile | null>(null);
  const [gifts, setGifts] = useState<domain.Gift[]>([]);
  const [reminders, setReminders] = useState<domain.Reminder[]>([]);
  const [reminderFormVisible, setReminderFormVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<domain.Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'reminder' | 'gift'; id: string; label: string } | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [detailGift, setDetailGift] = useState<domain.Gift | null>(null);
  const [chatGift, setChatGift] = useState<domain.Gift | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TagFilter>('all');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [occasionDetails, setOccasionDetails] = useState('');
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [budget, setBudget] = useState('');
  const [customBudget, setCustomBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [outroActive, setOutroActive] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'gift' | 'outing' | 'mixed'>('mixed');

  const sortedReminders = useMemo(
    () =>
      [...reminders].sort((a, b) => {
        const aTime = a.triggerAt ? new Date(a.triggerAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.triggerAt ? new Date(b.triggerAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }),
    [reminders],
  );

  const loadAll = useCallback(async () => {
    if (!friendId) {
      setLoading(false);
      return;
    }

    setFriendlyError(null);

    const remindersPromise = user?.userID
      ? apiClient
          .listRemindersByUserId(user.userID)
          .then((list) => list.filter((reminder) => reminder.friendID === friendId))
          .catch(() => [] as domain.Reminder[])
      : Promise.resolve([] as domain.Reminder[]);

    try {
      const [loadedFriend, loadedProfile, loadedGifts, loadedPhotoUrl, loadedReminders] =
        await Promise.all([
          apiClient.getFriendById(friendId),
          apiClient.getFriendProfile(friendId).catch(() => null),
          apiClient.listGiftsByFriendId(friendId).catch(() => []),
          apiClient
            .requestFriendProfilePhotoGetUrl(friendId)
            .then((signedUrl) => signedUrl.url)
            .catch(() => null),
          remindersPromise,
        ]);

      setFriend(loadedFriend);
      setProfile(loadedProfile);
      setBudget(loadedProfile?.budget ?? '');
      setGifts(loadedGifts);
      setPhotoUri(loadedPhotoUrl);
      setReminders(loadedReminders);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel carregar esse Migo agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [friendId, user?.userID]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadAll();
  };

  const avatar = friend?.avatar && friend.avatar.trim().length > 0 ? friend.avatar : (params.avatar || '⭐');
  const age = calcAge(friend?.birthDate);

  const progress = useMemo(
    () => calcProfileProgress(friend ?? {}, profile),
    [friend, profile],
  );

  const gaps = useMemo(
    () => (progress < 100 ? profileGaps(friend ?? {}, profile) : []),
    [friend, profile, progress],
  );

  const hintMessage = useMemo(
    () => (progress < 100 ? buildHintMessage(friend ?? {}, profile) : ''),
    [friend, profile, progress],
  );

  const hasChatGap = gaps.some((gap) => gap.action === 'chat');
  const hasEditGap = gaps.some((gap) => gap.action === 'edit');

  const allTags: TagItem[] = useMemo(() => {
    const likes = (profile?.likes ?? []).map((label) => ({ label, type: 'like' as const }));
    const dislikes = (profile?.dislikes ?? []).map((label) => ({ label, type: 'dislike' as const }));
    const traits = (profile?.personality ?? []).map((label) => ({ label, type: 'trait' as const }));
    return [...likes, ...dislikes, ...traits];
  }, [profile]);

  const filteredTags = activeFilter === 'all' ? allTags : allTags.filter((tag) => tag.type === activeFilter);

  const sortedFilteredTags = useMemo(
    () => [...filteredTags].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })),
    [filteredTags],
  );

  const goToChat = () => {
    if (!friendId) return;
    router.push({
      pathname: '/chat-builder',
      params: { friendId, friendName: friend?.name ?? '', avatar },
    } as never);
  };

  const goToEdit = () => {
    if (!friendId) return;
    router.push({
      pathname: '/add-friend',
      params: {
        mode: 'edit',
        friendId,
        friendName: friend?.name ?? '',
        avatar,
      },
    } as never);
  };

  const handleHintAction = (action: 'chat' | 'edit' | 'dismiss') => {
    if (action === 'chat') goToChat();
    else if (action === 'edit') goToEdit();
  };

  const handleChangePhoto = async () => {
    if (!friendId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso as suas fotos para continuar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType: 'image/jpeg' | 'image/png' =
      asset.mimeType === 'image/png' || asset.fileName?.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

    setPhotoBusy(true);

    try {
      const body: ProfilePhotoSignedUrlRequest = { contentType: mimeType };
      // TODO(API): sem endpoint de leitura da foto ainda; o preview so existe durante esta sessao.
      const signedUrl = photoUri
        ? await apiClient.requestFriendProfilePhotoUpdateUrl(friendId, body)
        : await apiClient.requestFriendProfilePhotoUploadUrl(friendId, body);

      if (signedUrl.method !== 'PUT') {
        throw new Error(`Metodo inesperado: ${signedUrl.method}`);
      }

      const uploadResult = await FileSystem.uploadAsync(signedUrl.url, asset.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': mimeType },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error('Falha ao enviar a foto.');
      }

      setPhotoUri(asset.uri);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a foto.';
      Alert.alert('Erro', message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!friendId) return;

    setPhotoBusy(true);

    try {
      const signedUrl = await apiClient.requestFriendProfilePhotoDeleteUrl(friendId);
      if (signedUrl.method !== 'DELETE') {
        throw new Error(`Metodo inesperado: ${signedUrl.method}`);
      }
      await apiClient.executeSignedProfilePhotoRequest(signedUrl.url, signedUrl.method);
      setPhotoUri(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel remover a foto.';
      Alert.alert('Erro', message);
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleAvatarPress = () => {
    Alert.alert('Foto de perfil', 'O que voce quer fazer?', [
      { text: photoUri ? 'Atualizar foto' : 'Adicionar foto', onPress: () => void handleChangePhoto() },
      ...(photoUri
        ? [{ text: 'Remover foto', style: 'destructive' as const, onPress: () => void handleRemovePhoto() }]
        : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const handleGenerateSuggestions = async () => {
    if (!friendId || generatingSuggestions) return;

    setGeneratingSuggestions(true);
    setFriendlyError(null);

    try {
      await apiClient.createSuggestions(friendId, {
        occasionDetails: occasionDetails.trim() || 'Nenhuma ocasião especial',
        suggestionType,
      });
      const loadedGifts = await apiClient.listGiftsByFriendId(friendId);
      setGifts(loadedGifts);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel gerar sugestões agora.');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const saveBudget = async (newBudget: string) => {
    if (!friendId || savingBudget) return;
    setSavingBudget(true);
    try {
      await apiClient.updateProfile(friendId, { friendID: friendId, budget: newBudget });
      setBudget(newBudget);
      setProfile((prev) => (prev ? { ...prev, budget: newBudget } : prev));
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel salvar o orcamento.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleBudgetChip = (value: string | null) => {
    if (budget === value) {
      void saveBudget('');
      setOutroActive(false);
    } else if (value) {
      void saveBudget(value);
      setOutroActive(false);
    } else {
      setOutroActive(true);
    }
  };

  const handleCustomBudgetSubmit = () => {
    const trimmed = customBudget.trim();
    if (trimmed) {
      void saveBudget(`Até R$${trimmed}`);
    }
  };

  const openNewReminder = () => {
    if (!user?.userID) {
      setFriendlyError('Sessao invalida. Volte e entre novamente.');
      return;
    }
    setEditingReminder(null);
    setReminderFormVisible(true);
  };

  const openEditReminder = (reminder: domain.Reminder) => {
    if (!user?.userID) {
      setFriendlyError('Sessao invalida. Volte e entre novamente.');
      return;
    }
    setEditingReminder(reminder);
    setReminderFormVisible(true);
  };

  const onReminderSaved = (saved: domain.Reminder) => {
    setReminders((prev) => {
      const id = saved.reminderID;
      if (id && prev.some((reminder) => reminder.reminderID === id)) {
        return prev.map((reminder) => (reminder.reminderID === id ? { ...reminder, ...saved } : reminder));
      }
      return [...prev, saved];
    });
    setReminderFormVisible(false);
    setEditingReminder(null);
  };

  const askDeleteReminder = (reminder: domain.Reminder) => {
    if (!reminder.reminderID) return;
    const meta = occasionMeta(reminder.type);
    setDeleteTarget({ kind: 'reminder', id: reminder.reminderID, label: meta.label });
  };

  const askDeleteGift = (gift: domain.Gift) => {
    if (!gift.giftID) return;
    setDeleteTarget({ kind: 'gift', id: gift.giftID, label: gift.title ?? 'sugestão' });
  };

  const cancelDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setFriendlyError(null);

    try {
      if (deleteTarget.kind === 'reminder') {
        await apiClient.deleteReminder(deleteTarget.id);
        setReminders((prev) => prev.filter((reminder) => reminder.reminderID !== deleteTarget.id));
      } else {
        await apiClient.deleteGift(deleteTarget.id);
        setGifts((prev) => prev.filter((gift) => gift.giftID !== deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Não foi possível deletar agora.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !friend) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#1CB0F6" size="large" />
        <Text style={styles.loadingText}>Carregando perfil... ✨</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }>
        <View style={styles.hero}>
          <SafeAreaView edges={['top']}>
            <View style={styles.heroHeader}>
              <TouchableOpacity
                style={styles.heroIconButton}
                onPress={() => router.back()}
                activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.heroTitle}>Raio-X ✨</Text>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroIconButton} onPress={goToEdit} activeOpacity={0.8}>
                  <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroIconButton} onPress={goToChat} activeOpacity={0.8}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              disabled={photoBusy}>
              {photoUri ? (
                <Image
                  source={{
                    uri: photoUri,
                    headers: { 'Content-Type': DEFAULT_PROFILE_PHOTO_CONTENT_TYPE },
                  }}
                  style={styles.avatarImage}
                  onError={() => setPhotoUri(null)}
                />
              ) : (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              )}
              {/* <View style={styles.avatarEditBadge}>
                {photoBusy ? (
                  <ActivityIndicator color="#1eb1f6" size="small" />
                ) : null}
              </View> */}
            </TouchableOpacity>

            <Text style={styles.heroName}>{friend?.name ?? params.friendName ?? 'Migo'}</Text>

            <View style={styles.heroMetaRow}>
              {friend?.city ? <Text style={styles.heroMeta}>📍 {friend.city}</Text> : null}
              {age ? <Text style={styles.heroMeta}>🎂 {age}</Text> : null}
              {friend?.userRelation ? <Text style={styles.heroMeta}>💛 {friend.userRelation}</Text> : null}
            </View>

            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>Perfil {progress}% completo</Text>
            </View>

            <TouchableOpacity style={styles.heroChatCta} onPress={goToChat} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.heroChatCtaText}>Conte-me mais sobre essa pessoa 💬</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}

          <ProfileHintBubble
            message={hintMessage}
            hasChatAction={hasChatGap}
            hasEditAction={hasEditGap}
            onAction={handleHintAction}
          />

          <Text style={styles.sectionTitle}>Personalidade</Text>

          <View style={styles.filterRow}>
            {(['all', 'like', 'dislike', 'trait'] as const).map((filter) => {
              const filterLabel =
                filter === 'all' ? 'Tudo' : filter === 'like' ? 'Gostos' : filter === 'dislike' ? 'Nao gosta' : 'Traços';
              const selected = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, selected && styles.filterChipSelected]}
                  onPress={() => setActiveFilter(filter)}
                  activeOpacity={0.8}>
                  <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                    {filterLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {sortedFilteredTags.length > 0 ? (
            <View style={styles.tagsViewport}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                <View style={styles.tagsWrap}>
                  {sortedFilteredTags.map((tag, index) => {
                    const palette = tagPalette(tag.type);
                    return (
                      <View
                        key={`${tag.type}-${tag.label}-${index}`}
                        style={[styles.tagPill, { backgroundColor: palette.background }]}>
                        <Text style={[styles.tagPillText, { color: palette.text }]}>{tag.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View style={styles.emptyPersonality}>
              <Text style={styles.emptyPersonalityEmoji}>💭</Text>
              <Text style={styles.emptyPersonalityText}>
                Ainda nao conversamos sobre a personalidade de {friend?.name ?? 'seu Migo'}.
              </Text>
              <TouchableOpacity style={styles.chatCta} onPress={goToChat} activeOpacity={0.85}>
                <Text style={styles.chatCtaText}>Iniciar conversa com IA 💬</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.remindersHeader}>
            <Text style={styles.sectionTitle}>Lembretes 🔔</Text>
            <TouchableOpacity
              style={styles.reminderAddButton}
              onPress={openNewReminder}
              activeOpacity={0.8}
              disabled={!user?.userID}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.reminderAddText}>Novo</Text>
            </TouchableOpacity>
          </View>

          {sortedReminders.length > 0 ? (
            <View style={styles.remindersList}>
              {sortedReminders.map((reminder, index) => {
                const meta = occasionMeta(reminder.type);
                const recurrenceLabel = RECURRENCE_META[reminder.recurrence ?? 'none'];
                const isRecurring = (reminder.recurrence ?? 'none') !== 'none';
                return (
                  <TouchableOpacity
                    key={reminder.reminderID ?? `${reminder.type}-${reminder.triggerAt}-${index}`}
                    style={styles.reminderCard}
                    activeOpacity={0.85}
                    onPress={() => openEditReminder(reminder)}>
                      <View style={styles.cardDeleteButtonShadow} />
                      <TouchableOpacity
                        style={styles.cardDeleteButton}
                        onPress={() => askDeleteReminder(reminder)}
                        activeOpacity={0.8}>
                        <Ionicons name="close-outline" size={16} color="#ffffff" />
                      </TouchableOpacity>
                    <View
                      style={[
                        styles.reminderIcon,
                        { backgroundColor: TAG_COLORS[index % TAG_COLORS.length] + '22' },
                      ]}>
                      <Text style={styles.reminderIconEmoji}>{meta.emoji}</Text>
                    </View>
                    <View style={styles.reminderBody}>
                      <Text style={styles.reminderTitle} numberOfLines={1}>
                        {meta.label}
                      </Text>
                      <Text style={styles.reminderDate}>{formatDisplayDate(reminder.triggerAt)}</Text>
                      {reminder.message ? (
                        <Text style={styles.reminderMessage} numberOfLines={2}>
                          {reminder.message}
                        </Text>
                      ) : null}
                    </View>
                    {isRecurring ? (
                      <View style={styles.recurrenceBadge}>
                        <Text style={styles.recurrenceBadgeText}>🔁 {recurrenceLabel}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyReminders}>
              <Text style={styles.emptyRemindersEmoji}>📭</Text>
              <Text style={styles.emptyRemindersText}>
                Nenhum lembrete para {friend?.name ?? 'esse Migo'} ainda.
              </Text>
              <TouchableOpacity style={styles.emptyRemindersCta} onPress={openNewReminder} activeOpacity={0.85}>
                <Text style={styles.emptyRemindersCtaText}>+ Adicionar lembrete</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Sugestões 🎁</Text>

          <TextInput
            value={occasionDetails}
            onChangeText={setOccasionDetails}
            placeholder="Alguma ocasião especial? (opcional)"
            placeholderTextColor="#9AA3AD"
            style={styles.input}
          />

          <Text style={styles.budgetLabel}>Defina um orçamento (opcional)</Text>

          <View style={styles.budgetRow}>
            {BUDGET_OPTIONS.map((opt) => {
              const selected = opt.value !== null && budget === opt.value;
              const isOutroSelected = opt.value === null && (outroActive || (budget !== '' && !BUDGET_OPTIONS.slice(0, 3).some((o) => o.value === budget)));
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.budgetChip,
                    (selected || isOutroSelected) && styles.budgetChipSelected,
                  ]}
                  onPress={() => handleBudgetChip(opt.value)}
                  activeOpacity={0.8}
                  disabled={savingBudget}>
                  <Text
                    style={[
                      styles.budgetChipText,
                      (selected || isOutroSelected) && styles.budgetChipTextSelected,
                    ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {outroActive ? (
            <View style={styles.budgetCustomRow}>
              <Text style={styles.budgetCustomPrefix}>R$</Text>
              <TextInput
                value={customBudget}
                onChangeText={(text) => setCustomBudget(text.replace(/\D/g, ''))}
                placeholder="limite"
                placeholderTextColor="#9AA3AD"
                keyboardType="numeric"
                maxLength={60}
                style={styles.budgetCustomInput}
                onBlur={handleCustomBudgetSubmit}
                onSubmitEditing={handleCustomBudgetSubmit}
              />
            </View>
          ) : null}

          <View style={styles.suggestionTypeRow}>
            {(['mixed', 'gift', 'outing'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.suggestionTypeChip,
                  suggestionType === type && styles.suggestionTypeChipSelected,
                ]}
                onPress={() => setSuggestionType(type)}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.suggestionTypeChipText,
                    suggestionType === type && styles.suggestionTypeChipTextSelected,
                  ]}>
                  {type === 'mixed' ? 'Ambos' : type === 'gift' ? 'Presente' : 'Passeio'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ChunkyButton
            label={generatingSuggestions ? 'Gerando...' : '💡 Sugerir'}
            onPress={() => void handleGenerateSuggestions()}
            loading={generatingSuggestions}
            color="#3B82F6"
            shadowColor="#1D4ED8"
          />

          <View style={styles.giftsList}>
            {gifts === null || gifts.length === 0 ? (
              <Text style={styles.emptyGiftsText}>
                Nenhuma sugestao ainda. Toque no botao acima para gerar ideias!
              </Text>
            ) : (
              gifts.map((gift, index) => (
                <TouchableOpacity
                  key={gift.giftID ?? index}
                  style={styles.giftCard}
                  activeOpacity={0.85}
                  onPress={() => setDetailGift(gift)}>
                  <View style={styles.cardDeleteButtonShadow} />
                  <TouchableOpacity
                    style={styles.cardDeleteButton}
                    onPress={() => askDeleteGift(gift)}
                    activeOpacity={0.8}>
                    <Ionicons name="close-outline" size={16} color="#ffffff" />
                  </TouchableOpacity>
                  <View
                    style={[styles.giftIcon, { backgroundColor: TAG_COLORS[index % TAG_COLORS.length] + '22' }]}>
                    <Text style={styles.giftIconEmoji}>
                      {gift.type === 'outing' ? '🎟️' : '🎁'}
                    </Text>
                  </View>
                  {gift.type === 'outing' ? (
                    <View style={styles.giftTypeBadge}>
                      <Text style={styles.giftTypeBadgeText}>Passeio</Text>
                    </View>
                  ) : null}
                  <View style={styles.giftBody}>
                    <Text style={styles.giftTitle} numberOfLines={1}>
                      {gift.title ?? 'Ideia de presente'}
                    </Text>
                    {gift.priceRange ? <Text style={styles.giftPrice}>{gift.priceRange}</Text> : null}
                    {gift.description ? (
                      <Text style={styles.giftDescription} numberOfLines={3}>
                        {gift.description}
                      </Text>
                    ) : null}
                    {gift.tags && gift.tags.length > 0 ? (
                      <View style={styles.giftTagsRow}>
                        {gift.tags.map((tag) => (
                          <View key={tag} style={styles.giftTagPill}>
                            <Text style={styles.giftTagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {user?.userID ? (
        <ReminderFormModal
          visible={reminderFormVisible}
          friendId={friendId}
          userId={user.userID}
          friendName={friend?.name ?? params.friendName ?? 'seu Migo'}
          editing={editingReminder}
          onClose={() => {
            setReminderFormVisible(false);
            setEditingReminder(null);
          }}
          onSaved={onReminderSaved}
        />
      ) : null}

      <ConfirmDeleteModal
        visible={deleteTarget !== null}
        title={deleteTarget?.kind === 'gift' ? 'Deletar sugestão?' : 'Deletar lembrete?'}
        message={
          deleteTarget
            ? `Tem certeza que quer deletar "${deleteTarget.label}"? Essa ação não pode ser desfeita.`
            : ''
        }
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={cancelDelete}
      />

      <GiftDetailModal gift={detailGift} visible={detailGift !== null} onClose={() => setDetailGift(null)} onChat={(g) => { setDetailGift(null); setChatGift(g); }} />

      <SuggestionChatModal
        gift={chatGift}
        visible={chatGift !== null}
        friendId={friendId}
        occasionDetails={occasionDetails}
        onClose={() => setChatGift(null)}
        onFinalized={(updated) => {
          setGifts((prev) => (prev ?? []).map((g) => (g.giftID === updated.giftID ? updated : g)));
          setChatGift(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  hero: {
    backgroundColor: '#E0F2FE',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 22,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(3,105,161,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  avatarWrap: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 32,
  },
  avatarEmoji: {
    fontSize: 46,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E7F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    color: '#0F172A',
    fontSize: 22,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
    marginTop: 12,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
  },
  heroMeta: {
    color: '#0369A1',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  progressBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(3,105,161,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  progressBadgeText: {
    color: '#0369A1',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  heroChatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: '#58CC02',
    borderRadius: 16,
    borderBottomWidth: 5,
    borderBottomColor: '#46A302',
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  heroChatCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Nunito_900Black',
  },
  body: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    color: '#2D3436',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  filterChipSelected: {
    backgroundColor: '#334155',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagsViewport: {
    maxHeight: 180,
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  tagPillText: {
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  emptyPersonality: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyPersonalityEmoji: {
    fontSize: 34,
  },
  emptyPersonalityText: {
    color: '#717182',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 19,
  },
  chatCta: {
    backgroundColor: '#1CB0F6',
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#1699D8',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  chatCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 8,
  },
  input: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingHorizontal: 16,
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  budgetLabel: {
    color: '#2D3436',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
    marginTop: -4,
  },
  budgetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  budgetChipSelected: {
    borderColor: '#FF9600',
    backgroundColor: '#FFF4E6',
  },
  budgetChipText: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  budgetChipTextSelected: {
    color: '#FF9600',
  },
  budgetCustomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetCustomPrefix: {
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_900Black',
  },
  budgetCustomInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingHorizontal: 14,
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  suggestionTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionTypeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  suggestionTypeChipSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#E8F6FF',
  },
  suggestionTypeChipText: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  suggestionTypeChipTextSelected: {
    color: '#1CB0F6',
  },
  giftsList: {
    gap: 12,
    marginTop: 4,
  },
  emptyGiftsText: {
    color: '#717182',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    paddingVertical: 12,
  },
  giftCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 4,
    borderBottomColor: '#D8E0E8',
    padding: 14,
    gap: 12,
    position: 'relative',
    paddingRight: 44,
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftIconEmoji: {
    fontSize: 24,
  },
  giftTypeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#FFF4E6',
  },
  giftTypeBadgeText: {
    color: '#FF9600',
    fontSize: 10,
    fontFamily: 'Nunito_800ExtraBold',
  },
  giftBody: {
    flex: 1,
    gap: 4,
  },
  giftTitle: {
    color: '#2D3436',
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  giftPrice: {
    color: '#FF9600',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  giftDescription: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 17,
  },
  giftTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  giftTagPill: {
    backgroundColor: '#f9f6f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  giftTagText: {
    color: '#5F6B73',
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  error: {
    color: '#D64545',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },

  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1CB0F6',
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#1699D8',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderAddText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  remindersList: {
    gap: 12,
    marginTop: 4,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 4,
    borderBottomColor: '#D8E0E8',
    padding: 14,
    gap: 12,
    alignItems: 'center',
    position: 'relative',
    paddingRight: 44,
  },
  cardDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 25,
    height: 25,
    borderRadius: 10,
    backgroundColor: '#f84e4e',
    borderWidth: 1,
    borderColor: '#c02727',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderBottomWidth: 4,
    borderBottomColor: '#c02727',
  },
  cardDeleteButtonShadow: {
    position: 'absolute',
    top: 12,
    right: 8,
    width: 25,
    height: 25,
    borderRadius: 10,
    backgroundColor: '#E8E8E8',
    zIndex: 1,
  },
  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderIconEmoji: {
    fontSize: 20,
  },
  reminderBody: {
    flex: 1,
    gap: 3,
  },
  reminderTitle: {
    color: '#2D3436',
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  reminderDate: {
    color: '#FF9600',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  reminderMessage: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 16,
  },
  recurrenceBadge: {
    backgroundColor: '#E7F7FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recurrenceBadgeText: {
    color: '#0369A1',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  emptyReminders: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  emptyRemindersEmoji: {
    fontSize: 32,
  },
  emptyRemindersText: {
    color: '#717182',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyRemindersCta: {
    backgroundColor: '#FF9600',
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#C97200',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyRemindersCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
