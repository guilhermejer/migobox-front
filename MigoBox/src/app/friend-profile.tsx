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
import { domain } from '@/types/domain';

const TAG_COLORS = ['#1CB0F6', '#58CC02', '#FF9600', '#A855F7', '#F43F5E', '#10B981'];

type TagFilter = 'all' | 'like' | 'dislike' | 'trait';
type TagItem = { label: string; type: 'like' | 'dislike' | 'trait' };

function calcAge(birthDate?: string): string | null {
  if (!birthDate) return null;
  const years = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
  );
  return `${years} anos`;
}

function tagColor(type: TagItem['type']) {
  if (type === 'like') return '#58CC02';
  if (type === 'dislike') return '#F43F5E';
  return '#A855F7';
}

export default function FriendProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId?: string; friendName?: string; avatar?: string }>();
  const friendId = params.friendId ?? '';

  const [friend, setFriend] = useState<domain.Friend | null>(
    friendId ? { friendID: friendId, name: params.friendName, avatar: params.avatar } : null,
  );
  const [profile, setProfile] = useState<domain.Profile | null>(null);
  const [gifts, setGifts] = useState<domain.Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TagFilter>('all');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [occasionDetails, setOccasionDetails] = useState('');
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);

  const loadAll = useCallback(async () => {
    if (!friendId) {
      setLoading(false);
      return;
    }

    setFriendlyError(null);

    try {
      const [loadedFriend, loadedProfile, loadedGifts, loadedPhotoUrl] = await Promise.all([
        apiClient.getFriendById(friendId),
        apiClient.getFriendProfile(friendId).catch(() => null),
        apiClient.listGiftsByFriendId(friendId).catch(() => []),
        apiClient
          .requestFriendProfilePhotoGetUrl(friendId)
          .then((signedUrl) => signedUrl.url)
          .catch(() => null),
      ]);

      setFriend(loadedFriend);
      setProfile(loadedProfile);
      setGifts(loadedGifts);
      setPhotoUri(loadedPhotoUrl);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel carregar esse Migo agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [friendId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadAll();
  };

  const avatar = friend?.avatar && friend.avatar.trim().length > 0 ? friend.avatar : (params.avatar || '⭐');
  const age = calcAge(friend?.birthDate);

  const progress = useMemo(() => {
    if (!profile) return 0;
    const total =
      (profile.likes?.length ?? 0) + (profile.dislikes?.length ?? 0) + (profile.personality?.length ?? 0);
    return Math.min(100, Math.round((total / 12) * 100));
  }, [profile]);

  const allTags: TagItem[] = useMemo(() => {
    const likes = (profile?.likes ?? []).map((label) => ({ label, type: 'like' as const }));
    const dislikes = (profile?.dislikes ?? []).map((label) => ({ label, type: 'dislike' as const }));
    const traits = (profile?.personality ?? []).map((label) => ({ label, type: 'trait' as const }));
    return [...likes, ...dislikes, ...traits];
  }, [profile]);

  const filteredTags = activeFilter === 'all' ? allTags : allTags.filter((tag) => tag.type === activeFilter);

  const goToChat = () => {
    if (!friendId) return;
    router.push({
      pathname: '/chat-builder',
      params: { friendId, friendName: friend?.name ?? '', avatar },
    } as never);
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
      // TODO(API): permitir vincular a um reminderID especifico quando a selecao de lembretes existir.
      await apiClient.createSuggestions(friendId, { occasionDetails: occasionDetails.trim() || undefined });
      const loadedGifts = await apiClient.listGiftsByFriendId(friendId);
      setGifts(loadedGifts);
    } catch (error) {
      const apiError = error as ApiError;
      setFriendlyError(apiError.message ?? 'Nao foi possivel gerar sugestoes agora.');
    } finally {
      setGeneratingSuggestions(false);
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
              <TouchableOpacity style={styles.heroIconButton} onPress={goToChat} activeOpacity={0.8}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
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
              <View style={styles.avatarEditBadge}>
                {photoBusy ? (
                  <ActivityIndicator color="#1CB0F6" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#1CB0F6" />
                )}
              </View>
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
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}

          <Text style={styles.sectionTitle}>Personalidade</Text>

          <View style={styles.filterRow}>
            {(['all', 'like', 'dislike', 'trait'] as const).map((filter) => {
              const filterLabel =
                filter === 'all' ? 'Tudo' : filter === 'like' ? 'Gostos' : filter === 'dislike' ? 'Nao gosta' : 'Tracos';
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

          {filteredTags.length > 0 ? (
            <View style={styles.tagsWrap}>
              {filteredTags.map((tag, index) => (
                <View
                  key={`${tag.type}-${tag.label}-${index}`}
                  style={[
                    styles.tagPill,
                    { backgroundColor: tagColor(tag.type) + '1A', borderColor: tagColor(tag.type) },
                  ]}>
                  <Text style={[styles.tagPillText, { color: tagColor(tag.type) }]}>{tag.label}</Text>
                </View>
              ))}
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

          <Text style={styles.sectionTitle}>Sugestoes de presente 🎁</Text>

          <TextInput
            value={occasionDetails}
            onChangeText={setOccasionDetails}
            placeholder="Alguma ocasiao especial? (opcional)"
            placeholderTextColor="#9AA3AD"
            style={styles.input}
          />

          <ChunkyButton
            label={generatingSuggestions ? 'Gerando...' : '🎁 Sugerir presentes'}
            onPress={() => void handleGenerateSuggestions()}
            loading={generatingSuggestions}
          />

          <View style={styles.giftsList}>
            {gifts === null || gifts.length === 0 ? (
              <Text style={styles.emptyGiftsText}>
                Nenhuma sugestao ainda. Toque no botao acima para gerar ideias!
              </Text>
            ) : (
              gifts.map((gift, index) => (
                <View key={gift.giftID ?? index} style={styles.giftCard}>
                  <View
                    style={[styles.giftIcon, { backgroundColor: TAG_COLORS[index % TAG_COLORS.length] + '22' }]}>
                    <Text style={styles.giftIconEmoji}>🎁</Text>
                  </View>
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
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#1CB0F6',
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito_800ExtraBold',
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
    color: '#FFFFFF',
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
    color: '#E7F7FF',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  progressBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 12,
  },
  progressBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Nunito_800ExtraBold',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#ECECEC',
  },
  filterChipSelected: {
    backgroundColor: '#1CB0F6',
    borderColor: '#1CB0F6',
  },
  filterChipText: {
    color: '#2D3436',
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
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
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
  },
  giftIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftIconEmoji: {
    fontSize: 20,
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
    backgroundColor: '#F8F9FA',
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
});
