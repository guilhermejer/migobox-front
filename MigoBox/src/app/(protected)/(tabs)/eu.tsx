import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { useUserContext } from '@/context/user-context';

const ACCENT_COLORS = [
  '#1CB0F6', '#58CC02', '#A855F7', '#F43F5E',
  '#FF9600', '#EC4899', '#10B981', '#3B82F6',
];

const LOOKAHEAD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
] as const;

function getInitials(name?: string): string {
  if (!name) return 'M';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name?: string): string {
  if (!name) return ACCENT_COLORS[0];
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % ACCENT_COLORS.length;
  return ACCENT_COLORS[index];
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export default function EuScreen() {
  const { user, logout } = useUserContext();
  const [lookahead, setLookahead] = useState(7);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.userID) return;
    apiClient
      .getUserById(user.userID)
      .then((u) => {
        if (u.suggestionLookaheadDays) {
          setLookahead(u.suggestionLookaheadDays);
        }
      })
      .catch(() => {});
  }, [user?.userID]);

  const handleSave = useCallback(async () => {
    if (!user?.userID || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiClient.updateUser(user.userID, { suggestionLookaheadDays: lookahead });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as ApiError).message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }, [user?.userID, lookahead, saving]);

  const initials = getInitials(user?.fullName);
  const color = getColor(user?.fullName);
  const hasMeta = Boolean(user?.city) || Boolean(user?.birthDate);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Eu</Text>
        </View>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: color + '22', borderColor: color }]}>
            <Text style={[styles.avatarText, { color }]}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{user?.fullName ?? 'Migo'}</Text>
          {user?.email ? <Text style={styles.profileEmail}>{user.email}</Text> : null}
          {hasMeta && (
            <View style={styles.metaRow}>
              {user?.city ? (
                <Text style={styles.metaText}>📍 {user.city}</Text>
              ) : null}
              {user?.city && user?.birthDate ? (
                <Text style={styles.metaDot}>·</Text>
              ) : null}
              {user?.birthDate ? (
                <Text style={styles.metaText}>🎂 {formatDate(user.birthDate)}</Text>
              ) : null}
            </View>
          )}
          {user?.planID && (
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>Plano {user.planID}</Text>
            </View>
          )}
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PREFERENCIAS</Text>
          <Text style={styles.sectionDesc}>
            Com quantos dias de antecedencia voce quer que o MigoBox gere sugestoes automaticas de
            presentes e passeios?
          </Text>
          <View style={styles.optionsRow}>
            {LOOKAHEAD_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.optionChip, lookahead === opt.value && styles.optionChipSelected]}
                onPress={() => {
                  setLookahead(opt.value);
                  setSaved(false);
                }}>
                <Text
                  style={[styles.optionChipText, lookahead === opt.value && styles.optionChipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <ChunkyButton
            label={saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
            onPress={() => void handleSave()}
            disabled={saving || saved}
            loading={saving}
            color="#58CC02"
            shadowColor="#3F9A02"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Budget default placeholder */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>BUDGET DEFAULT</Text>
          <Text style={styles.sectionDesc}>
            Defina um orcamento padrao para sugestoes automaticas.
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Em breve</Text>
          </View>
        </View>

        {/* Plan placeholder */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PLANO</Text>
          <Text style={styles.sectionDesc}>
            Gerencie sua assinatura do MigoBox.
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Em breve</Text>
          </View>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CONTA</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => void logout()}
            activeOpacity={0.7}>
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 24,
  },

  // Header
  header: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  title: {
    color: '#2D3436',
    fontSize: 24,
    fontFamily: 'Nunito_900Black',
  },

  // Card (shared for all sections)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ECECEC',
    padding: 20,
    gap: 12,
  },

  // Profile card internals
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Nunito_900Black',
  },
  profileName: {
    color: '#2D3436',
    fontSize: 20,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
  },
  profileEmail: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#717182',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  metaDot: {
    color: '#CCCCCC',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  planBadge: {
    alignSelf: 'center',
    backgroundColor: '#E8F6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#1CB0F6',
  },
  planBadgeText: {
    color: '#1CB0F6',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },

  // Section
  sectionTitle: {
    color: '#9AA3AD',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
    letterSpacing: 1,
  },
  sectionDesc: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  optionChipSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#E8F6FF',
  },
  optionChipText: {
    color: '#717182',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  optionChipTextSelected: {
    color: '#1CB0F6',
  },
  error: {
    color: '#D64545',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },

  // Coming soon badges
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  comingSoonText: {
    color: '#9AA3AD',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },

  // Logout
  logoutButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#D64545',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
  },
});
