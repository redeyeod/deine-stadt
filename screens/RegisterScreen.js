import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const nameRegex = /^[a-zA-Z0-9._-]+$/;

  const handleRegister = async () => {
    if(!name || !email || !password) return Alert.alert("Fehler", "Bitte alles ausfüllen.");

    if (password !== confirmPassword) {
      return Alert.alert("Fehler", "Die Passwörter stimmen nicht überein.");
    }

    // 1. Format-Check
    if (!nameRegex.test(name)) {
        return Alert.alert("Ungültiger Name", "Nur Buchstaben, Zahlen, . - _ erlaubt.");
    }

    setLoading(true);

    try {
      // 2. Einzigartigkeits-Check
      const q = query(collection(db, "users"), where("name", "==", name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
          setLoading(false);
          return Alert.alert("Vergeben", "Dieser Benutzername ist schon weg.");
      }

      // 3. User erstellen
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        city: null, // Default
        createdAt: new Date().toISOString(),
      });

      // Direkt wieder ausloggen, damit man sich einloggen muss (cleaner flow)
      await signOut(auth);

      navigation.replace("VerifyEmail", { email: email });

    } catch (err) {
      console.log(err);
      if (err.code === 'auth/email-already-in-use') Alert.alert("Fehler", "E-Mail bereits vergeben.");
      else if (err.code === 'auth/weak-password') Alert.alert("Fehler", "Passwort zu schwach (min. 6 Zeichen).");
      else Alert.alert("Fehler", err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
        <View style={styles.card}>
            <Text style={styles.title}>Konto erstellen 🚀</Text>
            <Text style={styles.subtitle}>Werde Teil deiner Stadt.</Text>

            <View style={styles.inputContainer}>
                <View>
                    <Text style={styles.label}>BENUTZERNAME</Text>
                    <TextInput 
                        placeholder="z.B. max_99" 
                        placeholderTextColor="#64748b"
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="none"
                    />
                    <Text style={styles.hint}>Erlaubt: a-z, 0-9, . - _</Text>
                </View>

                <View>
                    <Text style={styles.label}>E-MAIL</Text>
                    <TextInput 
                        placeholder="beispiel@mail.de" 
                        placeholderTextColor="#64748b"
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                </View>

                <View>
                    <Text style={styles.label}>PASSWORT</Text>
                    <TextInput 
                        placeholder="••••••••" 
                        placeholderTextColor="#64748b"
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    <TextInput 
                        placeholder="Passwort wiederholen" 
                        placeholderTextColor="#64748b"
                        style={[styles.input, {marginTop: 8}]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>
            </View>

            <TouchableOpacity onPress={handleRegister} disabled={loading} style={styles.button}>
                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Registrieren</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Bereits registriert? </Text>
                <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                    <Text style={styles.linkText}>Hier einloggen</Text>
                </TouchableOpacity>
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  
  inputContainer: { gap: 20, marginBottom: 32 },
  label: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', marginBottom: 6, paddingLeft: 4 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', color: 'white', padding: 16, borderRadius: 12, fontSize: 16 },
  hint: { color: '#64748b', fontSize: 10, marginTop: 4, paddingLeft: 4 },
  
  button: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: '#94a3b8' },
  linkText: { color: '#818cf8', fontWeight: 'bold' },
});