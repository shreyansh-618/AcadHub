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
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        semester: semester ? parseInt(semester, 10) : 1,
      });

      const { user, token } = response;
      await login(user, token);
      setError(null);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Signup failed";
      setError(message);
      Alert.alert("Signup Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboard}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.screen}>
          <View style={styles.header}>
            <Text style={styles.brand}>AcadHub</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Add the basics now. You can edit your profile later.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#98a2b3" value={name} onChangeText={setName} editable={!loading} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#98a2b3"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#98a2b3"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#98a2b3"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((current) => !current)}>
                  <MaterialCommunityIcons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>University</Text>
              <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#98a2b3" value={university} onChangeText={setUniversity} editable={!loading} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Department</Text>
              <TextInput style={styles.input} placeholder="Optional" placeholderTextColor="#98a2b3" value={branch} onChangeText={setBranch} editable={!loading} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Semester</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor="#98a2b3"
                value={semester}
                onChangeText={setSemester}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>

            <TouchableOpacity disabled={loading} onPress={handleSignup} style={[styles.primaryButton, loading && styles.disabledButton]}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
            </TouchableOpacity>

            {loading ? (
              <View style={styles.statusCard}>
                <ActivityIndicator size="small" color="#0a66c2" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Waking up server...</Text>
                  <Text style={styles.statusText}>This may take a few seconds on the deployed app.</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate("login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: "#f3f2ef",
  },
  header: {
    marginBottom: 28,
  },
  brand: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0a66c2",
    fontFamily: "Roboto",
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: "700",
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: "#475467",
    fontFamily: "Roboto",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#d0d7de",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#344054",
    fontFamily: "Roboto",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1f2328",
    backgroundColor: "#ffffff",
    fontFamily: "Roboto",
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: "#1f2328",
    fontFamily: "Roboto",
  },
  primaryButton: {
    backgroundColor: "#0a66c2",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
  statusCard: {
    marginTop: 16,
    backgroundColor: "#eef4ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#b2ddff",
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#175cd3",
    fontFamily: "Roboto",
  },
  statusText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    color: "#475467",
    fontFamily: "Roboto",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    color: "#475467",
    fontSize: 14,
    fontFamily: "Roboto",
  },
  footerLink: {
    color: "#0a66c2",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Roboto",
  },
});
