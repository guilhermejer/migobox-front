import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiClient, ApiError } from '@/api/api-client';
import { ChunkyButton } from '@/components/chunky-button';
import { useUserContext } from '@/context/user-context';

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

if (GOOGLE_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: GOOGLE_CLIENT_ID });
}

const WELCOME_VARIATIONS = [
  'Olha so quem esta de volta!',
  'Bem vindo de volta!',
  'Que bom te ver por aqui!',
  'Partiu achar presentes incriveis hoje?',
  'Sua MigoBox estava com saudade!',
];

export default function HomeScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [friendlyError, setFriendlyError] = useState<string | null>(null);
  const { setUser, setWelcomeMessage } = useUserContext();

  const handleSignIn = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setFriendlyError('Digite um e-mail para entrar.');
      return;
    }

    setFriendlyError(null);
    setLoading(true);

    try {
      const user = await apiClient.findUserByEmail(normalizedEmail);

      if (!user.userID) {
        setFriendlyError('Nao encontramos o identificador da sua conta.');
        return;
      }

      const randomIndex = Math.floor(Math.random() * WELCOME_VARIATIONS.length);
      setWelcomeMessage(WELCOME_VARIATIONS[randomIndex]);
      setUser(user);
      router.replace('/home' as never);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 404) {
        setFriendlyError('E-mail nao encontrado. Confira e tente novamente.');
      } else {
        setFriendlyError('Nao conseguimos entrar agora. Tente de novo em instantes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFriendlyError(null);
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        setFriendlyError('Nao foi possivel obter o token de autenticacao.');
        return;
      }

      const user = await apiClient.authGoogle(idToken);

      if (!user.userID) {
        setFriendlyError('Nao foi possivel criar sua conta.');
        return;
      }

      const randomIndex = Math.floor(Math.random() * WELCOME_VARIATIONS.length);
      setWelcomeMessage(WELCOME_VARIATIONS[randomIndex]);
      setUser(user);
      router.replace('/home' as never);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const errCode = (error as { code: string }).code;
        console.error('Google Sign-In error:', errCode, error);
        if (errCode === statusCodes.SIGN_IN_CANCELLED) {
          setFriendlyError(null);
          return;
        }
        if (errCode === statusCodes.IN_PROGRESS) {
          setFriendlyError('Autenticacao ja esta em andamento.');
          return;
        }
        if (errCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setFriendlyError('Google Play Services nao esta disponivel.');
          return;
        }
      }
      setFriendlyError('Nao foi possivel entrar com o Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.brand}>MigoBox</Text>

          <ChunkyButton
            label="Entrar com Google"
            onPress={handleGoogleSignIn}
            loading={loading}
            disabled={loading}
            color="#4285F4"
            shadowColor="#357AE8"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Digite seu e-mail"
            placeholderTextColor="#95A5A6"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          {friendlyError ? <Text style={styles.error}>{friendlyError}</Text> : null}

          <ChunkyButton
            label="Entrar"
            onPress={handleSignIn}
            loading={loading}
            disabled={loading}
          />

          <Text style={styles.devHint}>Continuar com e-mail (dev)</Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    gap: 16,
  },
  brand: {
    fontSize: 42,
    fontFamily: 'Nunito_900Black',
    textAlign: 'center',
    color: '#2D3436',
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9EDF2',
  },
  dividerText: {
    color: '#9AA3AD',
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E9EDF2',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: '#2D3436',
    backgroundColor: '#FFFFFF',
  },
  error: {
    color: '#D64545',
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  devHint: {
    color: '#9AA3AD',
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    marginTop: -8,
  },
});
