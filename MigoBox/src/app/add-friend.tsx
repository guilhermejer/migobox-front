import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

import { apiClient, ApiError, FriendUpsertRequest } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { useUserContext } from '@/context/user-context';
import { domain } from '@/types/domain';

const AVATAR_OPTIONS = [
  '🌸', '🎸', '✨', '🏀', '🎨', '🎮', '🌻', '🎯',
  '🦋', '🌈', '⚡', '🎵', '🍀', '🦊', '🌙', '🎲',
  '🦄', '🐬', '🎭', '🏄', '🌺', '🦁', '🐧', '🦅',
];

const RELATION_OPTIONS = [
  'Melhor amigo/a', 'Namorado/a', 'Conjuge', 'Irmao/Irma',
  'Primo/a', 'Colega de trabalho', 'Amigo/a da faculdade',
  'Amigo/a de infancia', 'Familiar', 'Outro',
];

const GENDER_OPTIONS: { value: domain.Gender; label: string; emoji: string }[] = [
  { value: 'female', label: 'Feminino', emoji: '👩' },
  { value: 'male', label: 'Masculino', emoji: '👨' },
  { value: 'other', label: 'Outro', emoji: '🧑' },
];

function formatBirthDateInput(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join('/');
}

function parseBirthDateToIso(text: string): string | undefined {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const isValid =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day) &&
    date <= new Date();

  if (!isValid) return undefined;
  return `${year}-${month}-${day}`;
}

export default function AddFriendScreen() {
  const router = useRouter();
  const { user } = useUserContext();

  const [step, setStep] = useState<1 | 2>(1);
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [customRelation, setCustomRelation] = useState('');
  const [city, setCity] = useState('');
  const [birthDateText, setBirthDateText] = useState('');
  const [gender, setGender] = useState<domain.Gender | ''>('');
  const [loading, setLoading] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);

  const effectiveRelation = relation === 'Outro' ? customRelation.trim() : relation;
  const canProceedStep1 = name.trim().length >= 2 && effectiveRelation.length > 0;

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }
    router.back();
  };

  const handleNext = () => {
    if (!canProceedStep1) return;
    setFriendlyError(null);
    setStep(2);
  };

  const handleCreate = async () => {
    if (!user?.userID) {
      setFriendlyError('Sessao invalida. Volte e entre novamente.');
      return;
    }

    setFriendlyError(null);
    setLoading(true);

    try {
      const payload: FriendUpsertRequest = {
        name: name.trim(),
        userRelation: effectiveRelation || undefined,
        avatar,
        city: city.trim() || undefined,
        birthDate: parseBirthDateToIso(birthDateText),
        gender: gender || undefined,
      };

      const friend = await apiClient.createFriend(user.userID, payload);

      router.replace({
        pathname: '/chat-builder',
        params: {
          friendId: friend.friendID ?? '',
          friendName: friend.name ?? name.trim(),
          avatar: friend.avatar ?? avatar,
        },
      } as never);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel criar o migo agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#2D3436" />
          </TouchableOpacity>
          <View style={styles.headerTexts}>
            <Text style={styles.kicker}>Passo {step} de 2</Text>
            <Text style={styles.title}>Criar novo Migo 🧑‍🤝‍🧑</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressSegment, styles.progressFilled]} />
          <View style={[styles.progressSegment, step === 2 && styles.progressFilled]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Escolha um emoji para o Migo</Text>
                <View style={styles.avatarGrid}>
                  {AVATAR_OPTIONS.map((option) => {
                    const selected = option === avatar;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
                        onPress={() => setAvatar(option)}
                        activeOpacity={0.8}>
                        <Text style={styles.avatarOptionEmoji}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Nome</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Como essa pessoa se chama?"
                  placeholderTextColor="#9AA3AD"
                  style={styles.input}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Qual a relacao de voces?</Text>
                <View style={styles.chipsWrap}>
                  {RELATION_OPTIONS.map((option) => {
                    const selected = relation === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setRelation(option)}
                        activeOpacity={0.8}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {relation === 'Outro' ? (
                  <TextInput
                    value={customRelation}
                    onChangeText={setCustomRelation}
                    placeholder="Conte pra gente..."
                    placeholderTextColor="#9AA3AD"
                    style={[styles.input, styles.customRelationInput]}
                  />
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.previewCard}>
                <View style={styles.previewAvatar}>
                  <Text style={styles.previewAvatarEmoji}>{avatar}</Text>
                </View>
                <Text style={styles.previewName}>{name.trim() || 'Seu novo Migo'}</Text>
                <Text style={styles.previewRelation}>{effectiveRelation || 'Relacao nao definida'}</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.label}>Cidade (opcional)</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Onde essa pessoa mora?"
                  placeholderTextColor="#9AA3AD"
                  style={styles.input}
                />

                <Text style={styles.label}>Data de nascimento (opcional)</Text>
                <TextInput
                  value={birthDateText}
                  onChangeText={(text) => setBirthDateText(formatBirthDateInput(text))}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#9AA3AD"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.input}
                />

                <Text style={styles.label}>Genero (opcional)</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((option) => {
                    const selected = gender === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.genderOption, selected && styles.genderOptionSelected]}
                        onPress={() => setGender(selected ? '' : option.value)}
                        activeOpacity={0.8}>
                        <Text style={styles.genderEmoji}>{option.emoji}</Text>
                        <Text style={[styles.genderLabel, selected && styles.genderLabelSelected]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.tipBox}>
                <Text style={styles.tipEmoji}>💡</Text>
                <Text style={styles.tipText}>
                  Depois de criar, vamos bater um papo com a nossa IA para descobrir gostos e ideias
                  de presente para {name.trim() || 'essa pessoa'}.
                </Text>
              </View>
            </>
          )}

          {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step === 1 ? (
            <ChunkyButton label="Proximo" onPress={handleNext} disabled={!canProceedStep1} />
          ) : (
            <ChunkyButton
              label={loading ? 'Criando...' : 'Criar Migo e continuar 🎉'}
              onPress={() => void handleCreate()}
              loading={loading}
            />
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
  },
  kicker: {
    color: '#1CB0F6',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    color: '#2D3436',
    fontSize: 22,
    fontFamily: 'Nunito_900Black',
  },
  progressTrack: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ECECEC',
  },
  progressFilled: {
    backgroundColor: '#1CB0F6',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 16,
    gap: 12,
  },
  label: {
    color: '#2D3436',
    fontSize: 13,
    fontFamily: 'Nunito_800ExtraBold',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  avatarOption: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionSelected: {
    backgroundColor: '#E7F7FF',
    borderColor: '#1CB0F6',
  },
  avatarOptionEmoji: {
    fontSize: 24,
  },
  input: {
    minHeight: 52,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingHorizontal: 16,
    color: '#2D3436',
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },
  customRelationInput: {
    marginTop: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  chipSelected: {
    backgroundColor: '#1CB0F6',
    borderColor: '#1CB0F6',
  },
  chipText: {
    color: '#2D3436',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ECECEC',
    borderBottomWidth: 5,
    borderBottomColor: '#D8E0E8',
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  previewAvatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#E7F7FF',
    borderWidth: 2,
    borderColor: '#1CB0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewAvatarEmoji: {
    fontSize: 36,
  },
  previewName: {
    color: '#2D3436',
    fontSize: 20,
    fontFamily: 'Nunito_900Black',
  },
  previewRelation: {
    color: '#717182',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#ECECEC',
    alignItems: 'center',
    gap: 4,
  },
  genderOptionSelected: {
    backgroundColor: '#E7F7FF',
    borderColor: '#1CB0F6',
  },
  genderEmoji: {
    fontSize: 22,
  },
  genderLabel: {
    color: '#717182',
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
  genderLabelSelected: {
    color: '#1CB0F6',
  },
  tipBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#E7F7FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
  },
  tipEmoji: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    color: '#2D3436',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 19,
  },
  error: {
    color: '#D64545',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
});
