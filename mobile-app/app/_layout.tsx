// @ts-nocheck
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "../store";
import { authService } from "../services/api";

// Screens
import HomeScreen from "./home";
import ResourcesScreen from "./resources";
import AssistantScreen from "./assistant";
import ProfileScreen from "./profile";
import ResourceDetailScreen from "./resource-detail";
import LoginScreen from "./auth/login";
import SignupScreen from "./auth/signup";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="resources"
        component={ResourcesScreen}
        options={{
          tabBarLabel: "Resources",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="assistant"
        component={AssistantScreen}
        options={{
          tabBarLabel: "Assistant",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#fff" },
      }}
    >
      <Stack.Screen
        name="login"
        component={LoginScreen}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="signup"
        component={SignupScreen}
        options={{ animationEnabled: false }}
      />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="home-tabs"
        component={HomeTabs}
        options={{ animationEnabled: false }}
      />
      <Stack.Screen
        name="resource-detail"
        component={ResourceDetailScreen}
        options={{
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}

export default function RootLayout() {
  const { token, initializeAuth } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setInitError] = useState(null);
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 Initializing AcadHub app...");

        // Initialize Firebase
        await authService.initialize();
        console.log("✓ Firebase initialized");

        // Initialize auth store
        await initializeAuth();
        console.log("✓ Auth store initialized");

        setIsInitialized(true);
        console.log("✓ App initialization complete");
      } catch (error) {
        console.error("✗ App initialization failed:", error);
        setInitError(error);
        // Still allow app to continue
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  if (!fontsLoaded || !isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {token ? (
          <Stack.Screen
            name="app"
            component={AppStack}
            options={{ animationEnabled: false }}
          />
        ) : (
          <Stack.Screen
            name="auth"
            component={AuthStack}
            options={{ animationEnabled: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
