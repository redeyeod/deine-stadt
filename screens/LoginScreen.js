import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; // WICHTIG: Für den Stadt-Check
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Zustand für User ohne bestätigte Mail
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [mailSent, setMailSent] = useState(false);

  const handleLogin = async () => {
    if(!email || !password) return Alert.alert("Fehler", "Bitte alles ausfüllen.");
    
    setLoading(true);
    setUnverifiedUser(null);

    try {
      // 1. Einloggen versuchen
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let user = userCredential.user;

      // 2. Status frisch vom Server laden (falls er gerade erst bestätigt hat)
      await user.reload();
      if (auth.currentUser) user = auth.currentUser;

      // 3. CHECK: Ist die E-Mail bestätigt?
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        await signOut(auth); // Sofort wieder ausloggen
        setLoading(false);
        return; // Hier stoppen wir
      }

      // 4. CHECK: Hat der User schon eine Stadt gewählt? (Onboarding)
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists() && userDoc.data().city) {
          // Stadt ist da -> Dashboard (replace verhindert "Zurück" zum Login)
          navigation.replace("Dashboard");
      } else {
          // Keine Stadt -> Onboarding
          navigation.replace("Onboarding");
      }

    } catch (err) {
      console.log(err.code);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
          Alert.alert("Login fehlgeschlagen", "E-Mail oder Passwort falsch.");
      } else {
          Alert.alert("Fehler", err.message);
      }
      setLoading(false);
    }
  };

  const handleResendMail = async () => {
    if (unverifiedUser) {
      try {
        await sendEmailVerification(unverifiedUser);
        setMailSent(true);
        Alert.alert("Gesendet", "Bestätigungs-Mail wurde erneut verschickt.");
      } catch (err) {
        Alert.alert("Fehler", "Konnte Mail nicht senden (zu viele Versuche?).");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Willkommen zurück 👋</Text>
        <Text style={styles.subtitle}>Melde dich an, um fortzufahren.</Text>

        {/* WARNUNG: NICHT VERIFIZIERT */}
        {unverifiedUser && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#f59e0b" style={{marginBottom: 8}} />
            <Text style={styles.warningTitle}>E-Mail nicht bestätigt!</Text>
            <Text style={styles.warningText}>Bitte klicke auf den Link in der E-Mail, die wir dir gesendet haben.</Text>
            
            {!mailSent ? (
              <TouchableOpacity onPress={handleResendMail} style={styles.resendButton}>
                <Text style={styles.resendText}>Bestätigungs-Mail erneut senden</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{color: '#4ade80', fontWeight: 'bold', marginTop: 8}}>Gesendet! ✅</Text>
            )}
          </View>
        )}

        {/* INPUTS */}
        <View style={styles.inputContainer}>
            <TextInput 
                placeholder="E-Mail Adresse" 
                placeholderTextColor="#64748b"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput 
                placeholder="Passwort" 
                placeholderTextColor="#64748b"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
        </View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.button}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Einloggen</Text>}
        </TouchableOpacity>

        {/* SWITCH TO REGISTER */}
        <View style={styles.footer}>
            <Text style={styles.footerText}>Noch kein Konto? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.linkText}>Jetzt registrieren</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  
  inputContainer: { gap: 16, marginBottom: 32 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', color: 'white', padding: 16, borderRadius: 12, fontSize: 16 },
  
  button: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#94a3b8' },
  linkText: { color: '#818cf8', fontWeight: 'bold' },

  // Warning Box
  warningBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  warningTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  warningText: { color: '#cbd5e1', textAlign: 'center', fontSize: 13, marginBottom: 12 },
  resendButton: { backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  resendText: { color: '#f59e0b', fontWeight: 'bold', fontSize: 12 }
});