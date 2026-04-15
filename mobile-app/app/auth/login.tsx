import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthStore } from "../../store";
import { authService } from "../../services/api";

type Props = NativeStackScreenProps<any, "login">;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, setError } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const { user, token } = response;
      await login(user, token);
      setError(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Login failed";
      setError(message);
      Alert.alert("Login Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#f5f7fa", "#eef2f8"]}
          style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}
        >
          {/* Logo Section */}
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text style={{ fontSize: 32, fontWeight: "bold", color: "#1a73e8" }}>
              AcadHub
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#5f6368",
                marginTop: 8,
              }}
            >
              AI-Powered Academic Intelligence
            </Text>
          </View>

          {/* Login Form */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 8,
              }}
            >
              Email
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                backgroundColor: "#ffffff",
              }}
              placeholder="Enter your email"
              placeholderTextColor="#9aa0a6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 8,
              }}
            >
              Password
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#dadce0",
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  paddingRight: 48,
                  fontSize: 16,
                  backgroundColor: "#ffffff",
                }}
                placeholder="Enter your password"
                placeholderTextColor="#9aa0a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 4,
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#5f6368"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            disabled={loading}
            onPress={handleLogin}
            style={{
              backgroundColor: loading ? "#9aa0a6" : "#1a73e8",
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 20 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "#dadce0" }} />
            <Text
              style={{
                marginHorizontal: 12,
                color: "#5f6368",
                fontSize: 14,
              }}
            >
              or
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "#dadce0" }} />
          </View>

          {/* Sign Up Link */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#5f6368", fontSize: 14 }}>
              Don't have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("signup")}>
              <Text
                style={{
                  color: "#1a73e8",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Sign up
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
