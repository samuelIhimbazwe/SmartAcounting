import React, {useEffect} from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import {loginWithPassword, updateLoginForm} from '../../store/slices/authSlice';
import type {AuthStackParamList} from '../../navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const pendingId = useSelector((s: RootState) => s.auth.pendingMfaChallengeId);
  const loading = useSelector((s: RootState) => s.auth.isLoading);
  const error = useSelector((s: RootState) => s.auth.error);
  const form = useSelector((s: RootState) => s.auth.loginForm);

  useEffect(() => {
    if (pendingId) {
      navigation.navigate('Mfa');
    }
  }, [pendingId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SmartAccounting</Text>
      <TextInput
        label="Username"
        value={form.username}
        onChangeText={t => dispatch(updateLoginForm({username: t}))}
        autoCapitalize="none"
        style={styles.field}
      />
      <TextInput
        label="Password"
        value={form.password}
        onChangeText={t => dispatch(updateLoginForm({password: t}))}
        secureTextEntry
        style={styles.field}
      />
      <TextInput
        label="Tenant ID"
        value={form.tenantId}
        onChangeText={t => dispatch(updateLoginForm({tenantId: t}))}
        autoCapitalize="none"
        style={styles.field}
      />
      <TextInput
        label="User ID"
        value={form.userId}
        onChangeText={t => dispatch(updateLoginForm({userId: t}))}
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
        Sign in
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
