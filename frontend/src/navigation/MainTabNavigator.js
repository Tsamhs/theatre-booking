import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { COLORS }        from '../theme/colors';
import HomeScreen        from '../screens/HomeScreen';
import MoviesScreen      from '../screens/MoviesScreen';
import ProfileScreen     from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          let name;
          if      (route.name === 'Home')    name = focused ? 'home'         : 'home-outline';
          else if (route.name === 'Movies')  name = focused ? 'film'         : 'film-outline';
          else                               name = focused ? 'person-circle': 'person-circle-outline';
          return <Ionicons name={name} size={24} color={color} />;
        },
        tabBarStyle: {
          backgroundColor:  COLORS.tabBar,
          borderTopColor:   COLORS.border,
          borderTopWidth:   1,
          height:           Platform.OS === 'ios' ? 84 : 62,
          paddingBottom:    Platform.OS === 'ios' ? 24 : 8,
          paddingTop:       8,
        },
        tabBarActiveTintColor:   COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Αρχική'    }} />
      <Tab.Screen name="Movies"  component={MoviesScreen}  options={{ title: 'Ταινίες'   }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Κρατήσεις' }} />
    </Tab.Navigator>
  );
}
