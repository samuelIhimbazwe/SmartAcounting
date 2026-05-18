import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {Button, TextInput} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from '../../store';
import type {AuthStackParamList} from '../../navigation/AuthNavigator';
import {cancelMfa, loginWithOtp, setOtpEntry} from '../../store/slices/authSlice';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Mfa'>;

export default function MfaScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch = useDispatch<AppDispatch>();
  const challengeId = useSelector((s: RootState) => s.auth.pendingMfaChallengeId);
  const otpEntry = useSelector((s: RootState) => s.auth.otpEntry);
  const loading = useSelector((s: RootState) => s.auth.isLoading);
  const error = useSelector((s: RootState) => s.auth.error);

  return (
    <View style={styles.container}>
      <Text style={styles.help}>
        Enter the one-time code sent to your email.
      </Text>
      <TextInput
        label="OTP code"
        value={otpEntry}
        onChangeText={t => dispatch(setOtpEntry(t))}
        keyboardType="number-pad"
        style={styles.field}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        mode="contained"
        loading={loading}
        disabled={loading || !challengeId || !otpEntry.trim()}
        onPress={() =>
          dispatch(
            loginWithOtp({
              mfaChallengeId: challengeId as string,
              otpCode: otpEntry.trim(),
            }),
          )
        }
        style={styles.button}
        contentStyle={styles.buttonInner}>
        Verify and continue
      </Button>
      <Button
        mode="text"
        onPress={() => {
          dispatch(cancelMfa());
          navigation.goBack();
        }}
        style={styles.button}
        contentStyle={styles.buttonInner}>
        Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, justifyContent: 'center'},
  help: {marginBottom: 16, fontSize: 14},
  field: {marginBottom: 10},
  button: {marginTop: 8},
  buttonInner: {minHeight: 48},
  error: {color: '#b00020', marginBottom: 8},
});
