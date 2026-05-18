import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {PaperProvider} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import {store, persistor} from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import {useNetwork} from './src/hooks/useNetwork';
import {useSync} from './src/hooks/useSync';

function Gatekeeper() {
  useNetwork();
  useSync();
  return (
    <>
      <RootNavigator />
      <Toast />
    </>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <PaperProvider>
              <Gatekeeper />
            </PaperProvider>
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
