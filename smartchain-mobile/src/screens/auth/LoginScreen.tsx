import React, {useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import {useTranslation} from 'react-i18next';
import type {AppDispatch, RootState} from '../../store';
import {
  loginWithPassword,
  restoreSessionFromRefresh,
  updateLoginForm,
} from '../../store/slices/authSlice';
import type {AuthStackParamList} from '../../navigation/AuthNavigator';
import {
  isBiometricUnlockEnabled,
  loadRefreshTokenWithBiometric,
} from '../../services/biometricUnlock';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const pendingId = useSelector((s: RootState) => s.auth.pendingMfaChallengeId);
  const loading = useSelector((s: RootState) => s.auth.isLoading);
  const error = useSelector((s: RootState) => s.auth.error);
  const form = useSelector((s: RootState) => s.auth.loginForm);
  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const refreshToken = useSelector((s: RootState) => s.auth.refreshToken);

  useEffect(() => {
    if (pendingId) {
      navigation.navigate('Mfa');
    }
  }, [pendingId, navigation]);

  useEffect(() => {
    if (!accessToken && isBiometricUnlockEnabled()) {
      void (async () => {
        const stored = await loadRefreshTokenWithBiometric();
        if (stored) {
          await dispatch(restoreSessionFromRefresh(stored));
        }
      })();
    }
  }, [accessToken, dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('auth.appName')}</Text>
      {isBiometricUnlockEnabled() ? (
        <Button
          mode="outlined"
          style={styles.field}
          loading={loading}
          onPress={() => {
            void (async () => {
              const stored = await loadRefreshTokenWithBiometric();
              if (stored) {
                await dispatch(restoreSessionFromRefresh(stored));
              }
            })();
          }}>
          {t('auth.biometricPrompt')}
        </Button>
      ) : null}
      <TextInput
        label={t('auth.username')}
        value={form.username}
        onChangeText={v => dispatch(updateLoginForm({username: v}))}
        autoCapitalize="none"
        style={styles.field}
      />
      <TextInput
        label={t('auth.password')}
        value={form.password}
        onChangeText={v => dispatch(updateLoginForm({password: v}))}
        secureTextEntry
        style={styles.field}
      />
      <TextInput
        label={t('auth.tenantId')}
        value={form.tenantId}
        onChangeText={v => dispatch(updateLoginForm({tenantId: v}))}
        autoCapitalize="none"
        style={styles.field}
      />
      <TextInput
        label={t('auth.userId')}
        value={form.userId}
        onChangeText={v => dispatch(updateLoginForm({userId: v}))}
        autoCapitalize="none"
        style={styles.field}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        mode="contained"
        loading={loading}
        disabled={loading}
        onPress={() => dispatch(loginWithPassword())}
        style={styles.button}
        contentStyle={styles.buttonInner}>
        {t('auth.signIn')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, justifyContent: 'center'},
  title: {marginBottom: 16, textAlign: 'center', fontSize: 22, fontWeight: '600'},
  field: {marginBottom: 10},
  button: {marginTop: 16},
  buttonInner: {minHeight: 48},
  error: {color: '#b00020', marginBottom: 8},
});
