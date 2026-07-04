import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { apiClient, ApiError, ReminderUpsertRequest } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { domain } from '@/types/domain';

type OccasionValue =
  | 'birthday'
  | 'anniversary'
  | 'holiday'
  | 'christmas'
  | 'valentines'
  | 'mothers_day'
  | 'fathers_day'
  | 'custom';

const OCCASION_TYPES: { value: OccasionValue; label: string; emoji: string }[] = [
  { value: 'birthday', label: 'Aniversário', emoji: '🎂' },
  { value: 'anniversary', label: 'Aniv. de casamento', emoji: '💍' },
  { value: 'holiday', label: 'Data festiva', emoji: '🎉' },
  { value: 'christmas', label: 'Natal', emoji: '🎄' },
  { value: 'valentines', label: 'Namorados', emoji: '💌' },
  { value: 'mothers_day', label: 'Dia das Mães', emoji: '🌷' },
  { value: 'fathers_day', label: 'Dia dos Pais', emoji: '🧔' },
  { value: 'custom', label: 'Personalizada', emoji: '⭐' },
];

const RECURRENCE_OPTIONS: { value: domain.ReminderRecurrence; label: string; emoji: string }[] = [
  { value: 'none', label: 'Único', emoji: '📌' },
  { value: 'yearly', label: 'Anual', emoji: '🔁' },
  { value: 'monthly', label: 'Mensal', emoji: '📆' },
  { value: 'weekly', label: 'Semanal', emoji: '🗓️' },
  { value: 'daily', label: 'Diário', emoji: '⏰' },
];

function formatDateInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
}

function parseDateToIso(text: string): string | undefined {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day) &&
    Number(year) >= 1900;

  if (!isValid) return undefined;
  return `${year}-${month}-${day}`;
}

type ReminderFormModalProps = {
  visible: boolean;
  friendId: string;
  userId: string;
  friendName: string;
  editing?: domain.Reminder | null;
  onClose: () => void;
  onSaved: (reminder: domain.Reminder) => void;
};

export function ReminderFormModal({
  visible,
  friendId,
  userId,
  friendName,
  editing,
  onClose,
  onSaved,
}: ReminderFormModalProps) {
  const initialOccasion: OccasionValue = (() => {
    if (!editing?.type) return 'birthday';
    const known = OCCASION_TYPES.find((option) => option.value === editing.type);
    return known ? (known.value as OccasionValue) : 'custom';
  })();

  const [occasion, setOccasion] = useState<OccasionValue>(initialOccasion);
  const [customType, setCustomType] = useState(
    editing?.type && !OCCASION_TYPES.some((option) => option.value === editing.type)
      ? editing.type
      : '',
  );
  const [recurrence, setRecurrence] = useState<domain.ReminderRecurrence>(
    editing?.recurrence ?? 'none',
  );
  const [dateText, setDateText] = useState(
    editing?.triggerAt ? formatDateInput(editing.triggerAt.replace(/-/g, '')) : '',
  );
  const [message, setMessage] = useState(editing?.message ?? '');
  const [saving, setSaving] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);

  const isCustom = occasion === 'custom';
  const effectiveType = isCustom ? customType.trim() : occasion;
  const parsedDate = parseDateToIso(dateText);
  const canSave = effectiveType.length >= (isCustom ? 2 : 1) && parsedDate !== undefined;

  const resetForm = () => {
    setOccasion('birthday');
    setCustomType('');
    setRecurrence('none');
    setDateText('');
    setMessage('');
    setFriendlyError(null);
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!canSave || saving || !friendId || !userId) return;

    setFriendlyError(null);
    setSaving(true);

    try {
      const body: ReminderUpsertRequest = {
        userID: userId,
        friendID: friendId,
        type: effectiveType,
        triggerAt: parsedDate,
        recurrence,
        message: message.trim() || undefined,
      };

      const saved = editing?.reminderID
        ? await apiClient.updateReminder(editing.reminderID, body)
        : await apiClient.createReminder(userId, body);

      resetForm();
      onSaved(saved);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Não foi possível salvar o lembrete agora.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.kicker}>{friendName}</Text>
              <Text style={styles.title}>{editing ? 'Editar lembrete' : 'Novo lembrete'} 🔔</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#2D3436" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Ocasião</Text>
            <View style={styles.chipsWrap}>
              {OCCASION_TYPES.map((option) => {
                const selected = occasion === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setOccasion(option.value)}
                    activeOpacity={0.8}>
                    <Text style={styles.chipEmoji}>{option.emoji}</Text>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isCustom ? (
              <TextInput
                value={customType}
                onChangeText={setCustomType}
                placeholder="Nome da ocasião (ex.: Formatura)"
                placeholderTextColor="#9AA3AD"
                style={[styles.input, styles.customInput]}
                maxLength={40}
              />
            ) : null}

            <Text style={styles.label}>Repetição</Text>
            <View style={styles.chipsWrap}>
              {RECURRENCE_OPTIONS.map((option) => {
                const selected = recurrence === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setRecurrence(option.value)}
                    activeOpacity={0.8}>
                    <Text style={styles.chipEmoji}>{option.emoji}</Text>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Data {recurrence === 'none' ? '' : '(primeira ocorrência)'}</Text>
            <TextInput
              value={dateText}
              onChangeText={(text) => setDateText(formatDateInput(text))}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#9AA3AD"
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
            />

            <Text style={styles.label}>Mensagem (opcional)</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Ex.: Comprar presente até uma semana antes"
              placeholderTextColor="#9AA3AD"
              style={[styles.input, styles.messageInput]}
              multiline
              maxLength={140}
            />

            {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}
          </ScrollView>

          <View style={styles.footer}>
            <ChunkyButton
              label={saving ? 'Salvando...' : 'Salvar lembrete'}
              onPress={() => void handleSave()}
              loading={saving}
              disabled={!canSave}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D8E0E8',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 10,
  },
  headerTexts: {
    flex: 1,
  },
  kicker: {
    color: '#1CB0F6',
    fontSize: 11,
    fontFamily: 'Nunito_700Bold',
  },
  title: {
    color: '#2D3436',
    fontSize: 20,
    fontFamily: 'Nunito_900Black',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  label: {
    color: '#2D3436',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
    marginTop: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  chipSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#E7F7FF',
  },
  chipEmoji: {
    fontSize: 15,
  },
  chipText: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
  },
  chipTextSelected: {
    color: '#1CB0F6',
  },
  input: {
    minHeight: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingHorizontal: 16,
    color: '#2D3436',
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
  },
  customInput: {
    marginTop: 2,
  },
  messageInput: {
    minHeight: 72,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  error: {
    color: '#D64545',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
});
