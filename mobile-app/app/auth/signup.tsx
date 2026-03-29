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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuthStore } from "../../store";
import { authService } from "../../services/api";

type Props = NativeStackScreenProps<any, "signup">;

export default function SignupScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [university, setUniversity] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, setError } = useAuthStore();

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.signup({
        name,
        email,
        password,
        university: university || "Not specified",
        branch: branch || "Computer Science",
        semester: semester ? parseInt(semester) : 1,
      });

      const { user, token } = response;
      await login(user, token);
      setError(null);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Signup failed";
      setError(message);
      Alert.alert("Signup Error", message);
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
          <View style={{ alignItems: "center", marginBottom: 30 }}>
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
              Create your account
            </Text>
          </View>

          {/* Signup Form */}
          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Name *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="Enter your name"
              placeholderTextColor="#9aa0a6"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Email *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
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

          {/* Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Password *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="Enter a secure password"
              placeholderTextColor="#9aa0a6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Confirm Password */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Confirm Password *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="Confirm your password"
              placeholderTextColor="#9aa0a6"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* University */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              University
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="(Optional)"
              placeholderTextColor="#9aa0a6"
              value={university}
              onChangeText={setUniversity}
              editable={!loading}
            />
          </View>

          {/* Branch */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Branch
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="(Optional)"
              placeholderTextColor="#9aa0a6"
              value={branch}
              onChangeText={setBranch}
              editable={!loading}
            />
          </View>

          {/* Semester */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#202124",
                marginBottom: 6,
              }}
            >
              Semester
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#dadce0",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: "#ffffff",
              }}
              placeholder="(Optional)"
              placeholderTextColor="#9aa0a6"
              value={semester}
              onChangeText={setSemester}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            disabled={loading}
            onPress={handleSignup}
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
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: "#5f6368", fontSize: 14 }}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("login")}>
              <Text
                style={{
                  color: "#1a73e8",
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
