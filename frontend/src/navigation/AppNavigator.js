import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth }            from '../context/AuthContext';
import { COLORS }             from '../theme/colors';
import LoginScreen            from '../screens/LoginScreen';
import RegisterScreen         from '../screens/RegisterScreen';
import MovieDetailScreen      from '../screens/MovieDetailScreen';
import ShowtimeScreen         from '../screens/ShowtimeScreen';
import SeatSelectionScreen    from '../screens/SeatSelectionScreen';
import ConfirmationScreen     from '../screens/ConfirmationScreen';
import MainTabNavigator       from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={s.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {user ? (
          // ── Authenticated ──────────────────────────────────────
          <>
            <Stack.Screen name="Main"          component={MainTabNavigator}    />
            <Stack.Screen name="MovieDetail"   component={MovieDetailScreen}   />
            <Stack.Screen name="Showtime"      component={ShowtimeScreen}      />
            <Stack.Screen name="SeatSelection" component={SeatSelectionScreen} />
            <Stack.Screen name="Confirmation"  component={ConfirmationScreen}  />
          </>
        ) : (
          // ── Public ────────────────────────────────────────────
          <>
            <Stack.Screen name="Login"    component={LoginScreen}    />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
