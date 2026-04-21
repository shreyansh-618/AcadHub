// @ts-nocheck
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuthStore } from "../store";
import { authService } from "../services/api";

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
        tabBarActiveTintColor: "#0a66c2",
        tabBarInactiveTintColor: "#667085",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#d0d7de",
          backgroundColor: "#ffffff",
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          fontFamily: "Roboto",
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
      <Stack.Screen name="login" component={LoginScreen} options={{ animationEnabled: false }} />
      <Stack.Screen name="signup" component={SignupScreen} options={{ animationEnabled: false }} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home-tabs" component={HomeTabs} options={{ animationEnabled: false }} />
      <Stack.Screen name="resource-detail" component={ResourceDetailScreen} options={{ presentation: "modal" }} />
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
        await authService.initialize();
        await initializeAuth();
        setIsInitialized(true);
      } catch (error) {
        console.error("App initialization failed:", error);
        setInitError(error);
        setIsInitialized(true);
      }
    };

    void initializeApp();
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
        <ActivityIndicator size="large" color="#0a66c2" />
        <Text
          style={{
            marginTop: 16,
            color: "#1f2328",
            fontSize: 16,
            fontWeight: "600",
            fontFamily: "Roboto",
          }}
        >
          Waking up server...
        </Text>
        <Text
          style={{
            marginTop: 6,
            color: "#667085",
            fontSize: 14,
            textAlign: "center",
            paddingHorizontal: 28,
            lineHeight: 22,
            fontFamily: "Roboto",
          }}
        >
          This may take a few seconds on the deployed app.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="app" component={AppStack} options={{ animationEnabled: false }} />
        ) : (
          <Stack.Screen name="auth" component={AuthStack} options={{ animationEnabled: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
