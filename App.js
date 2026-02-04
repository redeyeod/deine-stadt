import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

// FIREBASE IMPORTS
import { auth, db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

// SCREENS IMPORTIEREN
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyEmailScreen from './screens/VerifyEmailScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import MyEventsScreen from './screens/MyEventsScreen';
import ProfileScreen from './screens/ProfileScreen';
import EventDetailScreen from './screens/EventDetailScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import EditEventScreen from './screens/EditEventScreen';
import AdminScreen from './screens/AdminScreen';
import FavoritesScreen from './screens/FavoritesScreen'; // <--- NEU

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// === TAB NAVIGATION MIT ROLLEN-CHECK ===
function AppTabs() {
  const [role, setRole] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Rolle:", error);
        }
      }
    };
    fetchRole();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Entdecken') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Favoriten') iconName = focused ? 'heart' : 'heart-outline'; // <--- NEU
          else if (route.name === 'Meine Events') iconName = focused ? 'ticket' : 'ticket-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Entdecken" component={HomeScreen} />
      
      {/* Favoriten Tab für jeden sichtbar */}
      <Tab.Screen name="Favoriten" component={FavoritesScreen} />

      {/* Zeigt "Meine Events" nur für Creator und Admins an */}
      {(role === 'admin' || role === 'creator') && (
        <Tab.Screen name="Meine Events" component={MyEventsScreen} />
      )}

      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// === HAUPT STACK ===
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Dashboard" component={AppTabs} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="EditEvent" component={EditEventScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}