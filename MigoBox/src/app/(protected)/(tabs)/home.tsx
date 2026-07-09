import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError, DEFAULT_PROFILE_PHOTO_CONTENT_TYPE } from '@/api/api-client';
import { useUserContext } from '@/context/user-context';
import { domain } from '@/types/domain';
import { calcProfileProgress } from '@/utils/profile';

const ACCENT_COLORS = [
  '#1CB0F6', '#58CC02', '#A855F7', '#F43F5E',
  '#FF9600', '#EC4899', '#10B981', '#3B82F6',
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const REMINDER_CARD_HEIGHT = 88;
const REMINDER_CARD_GAP = 10;
const DEFAULT_FRIEND_AVATAR = '⭐';

function pickFriendAvatar(friend: domain.Friend) {
  if (friend.avatar && friend.avatar.trim().length > 0) return friend.avatar;
  return DEFAULT_FRIEND_AVATAR;
}

function daysUntilBirthday(birthDate?: string): number | null {
  if (!birthDate) return null;
  const now = new Date();
  const bd = new Date(birthDate);
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function calcAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const years = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  return `${years} anos`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntilDate(dateValue?: string): number | null {
  if (!dateValue) return null;
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = startOfDay(new Date());
  const target = startOfDay(parsed);
  return Math.ceil((target.getTime() - today.getTime()) / MS_PER_DAY);
}

function reminderTypeEmoji(type?: string) {
  const normalized = (type ?? '').toLowerCase();
  if (normalized === 'birthday') return '🎂';
  if (normalized === 'custom') return '⭐';
  return '🔔';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, welcomeMessage } = useUserContext();
  const [friends, setFriends] = useState<domain.Friend[]>([]);
  const [reminders, setReminders] = useState<domain.Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [photoUrlByFriendId, setPhotoUrlByFriendId] = useState<Record<string, string>>({});
  const [profileByFriendId, setProfileByFriendId] = useState<Record<string, domain.Profile>>({});

  const friendNameById = useMemo(() => {
    const map = new Map<string, string>();
    friends.forEach((friend) => {
      if (friend.friendID) {
        map.set(friend.friendID, friend.name ?? 'Amigo/a');
      }
    });
    return map;
  }, [friends]);

  const upcomingReminders = useMemo(
    () => reminders
      .map((reminder) => ({
        reminder,
        days: daysUntilDate(reminder.triggerAt),
      }))
      .filter((entry) => entry.days !== null && entry.days >= 0 && entry.days <= 30)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0)),
    [reminders],
  );

  const userId = user?.userID;

  const loadData = useCallback(async () => {
    if (!userId) {
      setFriendlyError('Sessao invalida. Volte para o login.');
      setLoading(false);
      return;
    }

    setFriendlyError(null);

    try {
      const [loadedFriends, loadedReminders] = await Promise.all([
        apiClient.listFriendsByUserId(userId),
        apiClient.listRemindersByUserId(userId),
      ]);

      setFriends(loadedFriends ?? []);
      setReminders(loadedReminders ?? []);

      const safeFriends = loadedFriends ?? [];
      const photoPromises = safeFriends.map(async (friend) => {
        if (!friend.friendID) return;
        try {
          const signedUrl = await apiClient.requestFriendProfilePhotoGetUrl(friend.friendID);
          if (signedUrl.url) {
            setPhotoUrlByFriendId((prev) => ({ ...prev, [friend.friendID!]: signedUrl.url }));
          }
        } catch {
          // No photo or error — use avatar/emoji fallback.
        }
      });

      const profilePromises = safeFriends.map(async (friend) => {
        if (!friend.friendID) return;
        try {
          const profile = await apiClient.getFriendProfile(friend.friendID);
          if (profile) {
            setProfileByFriendId((prev) => ({ ...prev, [friend.friendID!]: profile }));
          }
        } catch {
          // No profile yet — ok.
        }
      });

      await Promise.all([...photoPromises, ...profilePromises]);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status >= 500) {
        setFriendlyError('Nosso servidor esta indisponivel no momento.');
      } else {
        setFriendlyError('Nao foi possivel carregar sua home agora.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const goToFriendProfile = (friend: domain.Friend) => {
    if (!friend.friendID) return;
    router.push({
      pathname: '/friend-profile',
      params: {
        friendId: friend.friendID,
        friendName: friend.name ?? '',
        avatar: pickFriendAvatar(friend),
      },
    } as never);
  };

  const renderFriendCard = ({ item, index }: { item: domain.Friend; index: number }) => {
    const color = ACCENT_COLORS[index % ACCENT_COLORS.length];
    const days = daysUntilBirthday(item.birthDate);
    const age = calcAge(item.birthDate);
    const hasBirthdaySoon = days !== null && days <= 7;
    const progress = calcProfileProgress(item, profileByFriendId[item.friendID ?? '']);

    return (
      <TouchableOpacity
        style={styles.friendCard}
        activeOpacity={0.75}
        onPress={() => goToFriendProfile(item)}>
        <View style={[styles.avatar, { backgroundColor: color + '22', borderColor: color }]}>
          {item.friendID && photoUrlByFriendId[item.friendID] ? (
            <Image
              source={{
                uri: photoUrlByFriendId[item.friendID],
                headers: { 'Content-Type': DEFAULT_PROFILE_PHOTO_CONTENT_TYPE },
              }}
              style={styles.avatarImage}
              onError={() => {
                const id = item.friendID as string;
                setPhotoUrlByFriendId((prev) => {
                  const next = { ...prev };
                  delete next[id];
                  return next;
                });
              }}
            />
          ) : (
            <Text style={styles.avatarEmoji}>{pickFriendAvatar(item)}</Text>
          )}
        </View>

        <View style={styles.friendMeta}>
          <View style={styles.friendNameRow}>
            <Text style={styles.friendName}>{item.name ?? 'Sem nome'}</Text>
            {hasBirthdaySoon && days !== null && (
              <View style={styles.birthdayBadge}>
                <Text style={styles.birthdayBadgeText}>🎂 {days}d</Text>
              </View>
            )}
          </View>
          <Text style={styles.friendRelation}>
            {item.userRelation ?? 'Amigo/a'}{age ? ` \u00B7 ${age}` : ''}
          </Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { backgroundColor: color, width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{progress}%</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.arrowButton, { backgroundColor: color + '22' }]}
          onPress={() => goToFriendProfile(item)}>
          <Ionicons name="chevron-forward" size={18} color={color} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <>
      {upcomingReminders.length > 0 && (
        <View style={styles.remindersSection}>
          <Text style={styles.remindersTitle}>Proximos lembretes</Text>
          <View style={styles.remindersViewport}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {upcomingReminders.map((item, index) => {
                const friendName = item.reminder.friendID
                  ? (friendNameById.get(item.reminder.friendID) ?? 'Amigo/a')
                  : 'Amigo/a';
                const daysText = item.days === 0 ? 'Hoje' : `Em ${item.days} dias`;

                return (
                  <TouchableOpacity
                    key={item.reminder.reminderID
                      ?? `${item.reminder.friendID ?? 'friend'}-${item.reminder.triggerAt ?? 'date'}-${index}`}
                    style={styles.reminderCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (item.reminder.friendID) {
                        router.push({
                          pathname: '/friend-profile' as never,
                          params: { friendId: item.reminder.friendID, friendName },
                        } as never);
                      }
                    }}>
                    <View style={styles.reminderIconWrap}>
                      <Text style={styles.reminderEmoji}>{reminderTypeEmoji(item.reminder.type)}</Text>
                    </View>
                    <View style={styles.reminderBody}>
                      <Text style={styles.reminderFriendName} numberOfLines={1}>{friendName}</Text>
                      <Text style={styles.reminderMessage} numberOfLines={2}>
                        {item.reminder.message ?? 'Lembrete sem descricao.'}
                      </Text>
                    </View>
                    <Text style={styles.reminderDays}>{daysText}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {friendlyError ? <Text style={styles.errorText}>{friendlyError}</Text> : null}

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>Sua MigoBox 📦</Text>
          <Text style={styles.sectionSubtitle}>Seus amigos especiais</Text>
        </View>
        {friends.length > 0 && (
          <TouchableOpacity>
            <Text style={styles.seeAll}>Ver todos</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color="#1CB0F6" size="large" />
        <Text style={styles.loadingText}>Carregando sua MigoBox... ✨</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{welcomeMessage} 👋</Text>
          <Text style={styles.userName}>Ola, {user?.fullName?.split(' ')[0] ?? 'Migo'}!</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              Alert.alert('TODO', 'Notificacoes ainda nao foram implementadas na API.');
            }}>
            <Ionicons name="notifications-outline" size={20} color="#2D3436" />
            {reminders.length > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable content */}
      <FlatList
        data={friends}
        keyExtractor={(item, i) => item.friendID ?? `${item.name ?? 'f'}-${i}`}
        renderItem={renderFriendCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1CB0F6" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>Sua MigoBox esta vazia!</Text>
            <Text style={styles.emptySubtitle}>Adicione seus primeiros migos para comecar.</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-friend' as never)}
              activeOpacity={0.8}>
              <Text style={styles.emptyButtonText}>+ Adicionar amigo</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          friends.length > 0 ? (
            <TouchableOpacity
              style={styles.addSlot}
              onPress={() => router.push('/add-friend' as never)}>
              <Text style={styles.addSlotText}>+ Adicionar novo amigo</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FAB */}
      <View style={styles.fabWrapper}>
        <View style={styles.fabShadow} />
        <TouchableOpacity
          style={styles.fabButton}
          activeOpacity={0.85}
          onPress={() => router.push('/add-friend' as never)}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#F8FAFC',
  },
  loadingText: { color: '#2D3436', fontSize: 14, fontFamily: 'Nunito_700Bold' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 2, borderBottomColor: '#ECECEC',
  },
  headerLeft: { flex: 1 },
  greeting: { color: '#717182', fontSize: 13, fontFamily: 'Nunito_700Bold' },
  userName: { color: '#2D3436', fontSize: 22, lineHeight: 28, fontFamily: 'Nunito_800ExtraBold' },
  headerActions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  actionButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#ECECEC',
    alignItems: 'center', justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute', top: 8, right: 8,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FF9600', borderWidth: 2, borderColor: '#FFFFFF',
  },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 150 },

  // Reminder list
  remindersSection: { marginBottom: 18 },
  remindersTitle: {
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 10,
  },
  remindersViewport: {
    maxHeight: (REMINDER_CARD_HEIGHT * 3.3) + (REMINDER_CARD_GAP * 3),
    gap: 10,
  },
  reminderCard: {
    minHeight: REMINDER_CARD_HEIGHT,
    backgroundColor: '#FF9600',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFB44C',
    borderBottomWidth: 5,
    borderBottomColor: '#C97200',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: REMINDER_CARD_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8C28A',
  },
  reminderEmoji: { fontSize: 24 },
  reminderBody: { flex: 1 },
  reminderFriendName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Nunito_800ExtraBold',
  },
  reminderMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    marginTop: 2,
  },
  reminderDays: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },

  // Section heading
  sectionHeading: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: { color: '#2D3436', fontSize: 20, fontFamily: 'Nunito_800ExtraBold' },
  sectionSubtitle: { color: '#717182', fontSize: 12, fontFamily: 'Nunito_700Bold', marginTop: 2 },
  seeAll: { color: '#1CB0F6', fontSize: 13, fontFamily: 'Nunito_700Bold', paddingTop: 4 },

  // Friend card
  friendCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 2, borderColor: '#ECECEC',
    borderBottomWidth: 5, borderBottomColor: '#D8E0E8',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27, overflow: 'hidden',
    borderWidth: 3, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  avatarEmoji: { fontSize: 24 },
  friendMeta: { flex: 1 },
  friendNameRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, flexWrap: 'wrap', marginBottom: 2,
  },
  friendName: { color: '#2D3436', fontSize: 16, fontFamily: 'Nunito_800ExtraBold' },
  birthdayBadge: { backgroundColor: '#FF960022', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  birthdayBadgeText: { color: '#C97200', fontSize: 10, fontFamily: 'Nunito_700Bold' },
  friendRelation: { color: '#717182', fontSize: 13, fontFamily: 'Nunito_700Bold', marginBottom: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#ECECEC', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { color: '#717182', fontSize: 11, fontFamily: 'Nunito_700Bold', minWidth: 28 },
  arrowButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: '#2D3436', textAlign: 'center', fontSize: 17, fontFamily: 'Nunito_800ExtraBold' },
  emptySubtitle: { color: '#717182', textAlign: 'center', fontSize: 14, fontFamily: 'Nunito_700Bold' },
  emptyButton: {
    marginTop: 8, backgroundColor: '#1CB0F6', borderRadius: 18,
    paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 5, borderBottomColor: '#0F8FC4',
  },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Nunito_800ExtraBold' },

  // Add slot
  addSlot: {
    borderRadius: 20, borderWidth: 2, borderColor: '#CCCCCC',
    borderStyle: 'dashed', paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  addSlotText: { color: '#AAAAAA', fontSize: 14, fontFamily: 'Nunito_700Bold' },

  // FAB — two-layer chunky pattern
  fabWrapper: {
    position: 'absolute', right: 20, bottom: 88,
    width: 64, height: 70,
  },
  fabShadow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 64, borderRadius: 22,
    backgroundColor: '#0F8FC4',
  },
  fabButton: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 64, borderRadius: 22,
    backgroundColor: '#1CB0F6',
    alignItems: 'center', justifyContent: 'center',
  },

  // Error
  errorText: { color: '#D64545', marginBottom: 12, textAlign: 'center', fontFamily: 'Nunito_700Bold' },
});
