import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiClient, ApiError } from '@/api/api-client';
import { useUserContext } from '@/context/user-context';

const LOOKAHEAD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
] as const;

export default function SettingsScreen() {
  const { user } = useUserContext();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configurações</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ANTECEDÊNCIA DE SUGESTÕES</Text>
        <Text style={styles.sectionDesc}>
          Com quantos dias de antecedência você quer que o MigoBox gere sugestões automáticas de presentes e
          passeios?
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
              <Text style={[styles.optionChipText, lookahead === opt.value && styles.optionChipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.saveButton, (saving || saved) && styles.saveButtonDisabled]}
        onPress={() => void handleSave()}
        disabled={saving || saved}>
        <Text style={styles.saveButtonText}>
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    gap: 24,
  },
  title: {
    color: '#2D3436',
    fontSize: 24,
    fontFamily: 'Nunito_900Black',
    marginTop: 20,
  },
  section: {
    gap: 10,
  },
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
  saveButton: {
    backgroundColor: '#58CC02',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 6,
    borderBottomColor: '#3F9A02',
  },
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito_900Black',
  },
  error: {
    color: '#D64545',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
});
