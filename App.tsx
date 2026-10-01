import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { Literata_400Regular, Literata_400Regular_Italic } from '@expo-google-fonts/literata';
import { AppProvider, useApp } from './src/store';
import { TurnProvider } from './src/turns';
import { Nav, NavProvider, Route } from './src/nav';
import { C } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { NewScreen } from './src/screens/NewScreen';
import { HeroScreen } from './src/screens/HeroScreen';
import { StoryScreen } from './src/screens/StoryScreen';
import { SheetScreen } from './src/screens/SheetScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ArchivoBlack_400Regular,
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Literata_400Regular,
    Literata_400Regular_Italic,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <TurnProvider>{fontsLoaded || fontError ? <Root /> : <Loading />}</TurnProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}

function Root() {
  const { loaded } = useApp();
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);

  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const nav: Nav = useMemo(
    () => ({
      push: (r) => setStack((s) => [...s, r]),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      back,
      home: () => setStack([{ name: 'home' }]),
    }),
    [back],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, back]);

  if (!loaded) return <Loading />;

  const route = stack[stack.length - 1];
  let screen: React.ReactNode;
  switch (route.name) {
    case 'home':
      screen = <HomeScreen />;
      break;
    case 'new':
      screen = <NewScreen />;
      break;
    case 'hero':
      screen = <HeroScreen world={route.world} />;
      break;
    case 'story':
      screen = <StoryScreen key={route.id} id={route.id} />;
      break;
    case 'sheet':
      screen = <SheetScreen id={route.id} />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
  }

  return (
    <NavProvider value={nav}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>{screen}</View>
    </NavProvider>
  );
}
