import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError } from '@/api/api-client';
import { CalendarGrid } from '@/components/calendar-grid';
import { expandReminders } from '@/utils/reminder-occurrences';

import { domain } from '@/types/domain';
import { useUserContext } from '@/context/user-context';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const RECURRENCE_LABEL: Record<string, string> = {
  none: '',
  yearly: 'Anual',
  monthly: 'Mensal',
};

function reminderTypeEmoji(type?: string) {
  const normalized = (type ?? '').toLowerCase();
  if (normalized === 'aniversário') return '🎂';
  if (normalized === 'personalizada') return '⭐';
  return '🔔';
}

function reminderTypeLabel(type?: string) {
  const normalized = (type ?? '').toLowerCase();
  if (normalized === 'aniversário') return 'Aniversário';
  if (normalized === 'personalizada') return 'Personalizado';
  return type ?? 'Evento';
}

function todayStr(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function monthStartStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function monthEndStr(year: number, month: number): string {
  const days = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
}

function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`;
}

export default function DatasScreen() {
  const router = useRouter();
  const { user } = useUserContext();

  const [reminders, setReminders] = useState<domain.Reminder[]>([]);
  const [friends, setFriends] = useState<domain.Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());

  const userId = user?.userID;

  const loadData = useCallback(async () => {
    if (!userId) {
      setFriendlyError('Sessao invalida. Volte para o login.');
      setLoading(false);
      return;
    }
    setFriendlyError(null);
    try {
      const [loadedReminders, loadedFriends] = await Promise.all([
        apiClient.listRemindersByUserId(userId),
        apiClient.listFriendsByUserId(userId),
      ]);
      setReminders(loadedReminders ?? []);
      setFriends(loadedFriends ?? []);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(
        apiError.status >= 500
          ? 'Nosso servidor esta indisponivel no momento.'
          : 'Nao foi possivel carregar as datas.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const friendNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of friends) {
      if (f.friendID) map.set(f.friendID, f.name ?? 'Amigo/a');
    }
    return map;
  }, [friends]);

  const markedDates = useMemo(() => {
    const from = monthStartStr(currentYear, currentMonth);
    const to = monthEndStr(currentYear, currentMonth);
    const expanded = expandReminders(reminders, from, to);
    return new Set(expanded.map((e) => e.date));
  }, [reminders, currentYear, currentMonth]);

  const dayReminders = useMemo(() => {
    const from = monthStartStr(currentYear, currentMonth);
    const to = monthEndStr(currentYear, currentMonth);
    const expanded = expandReminders(reminders, from, to);
    return expanded.filter((e) => e.date === selectedDate);
  }, [reminders, currentYear, currentMonth, selectedDate]);

  const goPrevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(todayStr());
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#1CB0F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1CB0F6" />}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Datas</Text>
          </View>
          <TouchableOpacity style={styles.todayButton} onPress={goToday} activeOpacity={0.8}>
            <Text style={styles.todayButtonText}>Hoje</Text>
          </TouchableOpacity>
        </View>

        {friendlyError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{friendlyError}</Text>
          </View>
        ) : null}

        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.monthArrow} onPress={goPrevMonth} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#2D3436" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity style={styles.monthArrow} onPress={goNextMonth} activeOpacity={0.8}>
            <Ionicons name="chevron-forward" size={22} color="#2D3436" />
          </TouchableOpacity>
        </View>

        {/* Calendar grid */}
        <CalendarGrid
          year={currentYear}
          month={currentMonth}
          markedDates={markedDates}
          selectedDate={selectedDate}
          onDatePress={setSelectedDate}
        />

        {/* Day reminders */}
        <View style={styles.daySection}>
          <Text style={styles.dayTitle}>Lembretes de {formatDayHeader(selectedDate)}</Text>
          {dayReminders.length === 0 ? (
            <Text style={styles.emptyDay}>Nenhum lembrete neste dia.</Text>
          ) : (
            <View style={styles.reminderList}>
              {dayReminders.map((item) => {
                const friendName = item.reminder.friendID
                  ? (friendNameById.get(item.reminder.friendID) ?? 'Amigo/a')
                  : 'Amigo/a';
                const recurrenceLabel = RECURRENCE_LABEL[item.reminder.recurrence ?? 'none'];

                return (
                  <TouchableOpacity
                    key={`${item.reminder.reminderID ?? item.reminder.friendID}-${item.date}`}
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
                      <Text style={styles.reminderFriendName} numberOfLines={1}>
                        {friendName}
                      </Text>
                      <Text style={styles.reminderTypeTag}>{reminderTypeLabel(item.reminder.type)}</Text>
                      {item.reminder.message ? (
                        <Text style={styles.reminderMessage} numberOfLines={2}>
                          {item.reminder.message}
                        </Text>
                      ) : null}
                      {recurrenceLabel && (
                        <Text style={styles.reminderRecurrence}>🔁 {recurrenceLabel}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#2D3436',
    fontSize: 24,
    fontFamily: 'Nunito_900Black',
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1CB0F6',
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#0F8FC4',
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
  },
  errorText: {
    color: '#D64545',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  monthArrow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: '#2D3436',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
  },
  daySection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  dayTitle: {
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
    marginBottom: 12,
  },
  emptyDay: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    paddingVertical: 20,
  },
  reminderList: {
    gap: 10,
  },
  reminderCard: {
    minHeight: 88,
    backgroundColor: '#FF9600',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFB44C',
    borderBottomWidth: 5,
    borderBottomColor: '#C97200',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  reminderTypeTag: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
    marginTop: 2,
  },
  reminderMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    marginTop: 2,
  },
  reminderRecurrence: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
    marginTop: 4,
  },
});
