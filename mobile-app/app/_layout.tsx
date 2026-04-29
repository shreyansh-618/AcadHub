// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const TAB_ICONS = {
  home: "home-variant-outline",
  resources: "file-document-outline",
  assistant: "robot-outline",
  profile: "account-circle-outline",
};

function AnimatedTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const tabWidth = barWidth / Math.max(state.routes.length, 1);

  useEffect(() => {
    if (!barWidth) return;

    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth + 5,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [barWidth, indicatorX, state.index, tabWidth]);

  return (
    <View style={[styles.tabBarShell, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View
        style={styles.tabBar}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      >
        {barWidth ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activeTabIndicator,
              {
                width: Math.max(tabWidth - 10, 56),
                transform: [{ translateX: indicatorX }],
              },
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabButton}
            >
              <Animated.View
                style={[
                  styles.tabIconWrap,
                  {
                    transform: [{ scale: isFocused ? 1.08 : 1 }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={TAB_ICONS[route.name] || "circle-outline"}
                  color={isFocused ? "#0a66c2" : "#667085"}
                  size={22}
                />
              </Animated.View>
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
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

const styles = StyleSheet.create({
  tabBarShell: {
    backgroundColor: "#f3f2ef",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tabBar: {
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d0d7de",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#101828",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  activeTabIndicator: {
    position: "absolute",
    top: 7,
    bottom: 7,
    borderRadius: 14,
    backgroundColor: "#e8f3ff",
  },
  tabButton: {
    flex: 1,
    minHeight: 62,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 4,
  },
  tabIconWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: "#667085",
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  tabLabelActive: {
    color: "#0a66c2",
  },
});

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
