import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { updateProfile, updateEmail, updatePassword, signOut, deleteUser } from "firebase/auth";
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Verfügbare Städte
const CITIES = [
  { id: "karlsruhe", name: "Karlsruhe" },
  { id: "berlin", name: "Berlin" },
  { id: "hamburg", name: "Hamburg" },
  { id: "muenchen", name: "München" },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = auth.currentUser; // Der aktuelle User

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editing, setEditing] = useState(null); // Welches Feld wird bearbeitet?

  // Temp States für Bearbeitung
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempCity, setTempCity] = useState("");
  const [displayCity, setDisplayCity] = useState("Lädt...");

  const nameRegex = /^[a-zA-Z0-9._-]+$/;

  // 1. Daten laden
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        // Name & Email vom Auth User nehmen als Fallback
        setTempName(user.displayName || "");
        setTempEmail(user.email || "");

        // Zusätzliche Daten aus Firestore holen (Stadt, exakter Name)
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.name) setTempName(data.name);
          
          const citySlug = data.city || "";
          setTempCity(citySlug);
          
          const cityObj = CITIES.find(c => c.id === citySlug);
          setDisplayCity(cityObj ? cityObj.name : "Nicht gewählt");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // 2. Speicher-Logik
  const handleSave = async (field) => {
    setSaveLoading(true);

    try {
      if (field === "name") {
        // A) Format Check
        if (!nameRegex.test(tempName)) {
            Alert.alert("Fehler", "Name ungültig. Nur Buchstaben, Zahlen, . - _");
            setSaveLoading(false);
            return;
        }

        // B) Einzigartigkeits-Check
        const q = query(collection(db, "users"), where("name", "==", tempName));
        const querySnapshot = await getDocs(q);
        const isTaken = querySnapshot.docs.some(d => d.id !== user.uid);

        if (isTaken) {
            Alert.alert("Fehler", "Dieser Name ist bereits vergeben.");
            setSaveLoading(false);
            return;
        }

        // C) Speichern
        await updateProfile(user, { displayName: tempName });
        await updateDoc(doc(db, "users", user.uid), { name: tempName });
        Alert.alert("Erfolg", "Benutzername geändert!");

      } else if (field === "email") {
        await updateEmail(user, tempEmail);
        await updateDoc(doc(db, "users", user.uid), { email: tempEmail });
        Alert.alert("Erfolg", "E-Mail aktualisiert!");

      } else if (field === "password") {
        await updatePassword(user, tempPassword);
        Alert.alert("Erfolg", "Passwort geändert!");
        setTempPassword("");

      } else if (field === "city") {
        await updateDoc(doc(db, "users", user.uid), { city: tempCity });
        const cityObj = CITIES.find(c => c.id === tempCity);
        setDisplayCity(cityObj ? cityObj.name : "Unbekannt");
        // Kleines Feedback ohne Alert, da UI direkt updated
      }

      setEditing(null); // Bearbeitungsmodus beenden

    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert("Sicherheits-Check", "Bitte logge dich neu ein, um diese Änderung vorzunehmen.");
        await signOut(auth);
        navigation.replace("Login");
      } else {
        Alert.alert("Fehler", error.message);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
        await signOut(auth);
        // Durch den Stack Navigator landen wir automatisch beim Login, 
        // oder wir erzwingen es hier:
        navigation.replace("Login"); 
    } catch (e) {
        console.error(e);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
        "Account löschen?",
        "Das kann nicht rückgängig gemacht werden. Alle Daten gehen verloren.",
        [
            { text: "Abbrechen", style: "cancel" },
            { text: "Löschen", style: "destructive", onPress: async () => {
                try {
                    await deleteDoc(doc(db, "users", user.uid));
                    await deleteUser(user);
                    navigation.replace("Login");
                } catch (error) {
                    if (error.code === 'auth/requires-recent-login') {
                        Alert.alert("Fehler", "Bitte logge dich neu ein, um zu löschen.");
                    } else {
                        Alert.alert("Fehler", error.message);
                    }
                }
            }}
        ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1"/></View>;
  if (!user) return <View style={styles.center}><Text style={{color:'white'}}>Nicht eingeloggt</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      
      {/* HEADER / AVATAR */}
      <View style={styles.header}>
        <View style={styles.avatar}>
            <Text style={styles.avatarText}>{tempName ? tempName[0].toUpperCase() : "U"}</Text>
        </View>
        <Text style={styles.headerTitle}>Dein Profil</Text>
        <Text style={styles.headerSubtitle}>Verwalte deine Daten</Text>
      </View>

      <View style={styles.card}>
        
        {/* === STADT === */}
        <View style={styles.section}>
            <View style={styles.labelRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="location" size={16} color="#64748b" />
                    <Text style={styles.label}>DEINE STADT</Text>
                </View>
                {editing === 'city' ? (
                   <View style={{flexDirection:'row', gap: 10}}>
                       <TouchableOpacity onPress={() => setEditing(null)}>
                           <Ionicons name="close" size={20} color="#f87171" />
                       </TouchableOpacity>
                       {saveLoading ? <ActivityIndicator size="small" color="#4ade80"/> : (
                           <TouchableOpacity onPress={() => handleSave('city')}>
                               <Ionicons name="checkmark" size={20} color="#4ade80" />
                           </TouchableOpacity>
                       )}
                   </View>
                ) : (
                   <TouchableOpacity onPress={() => setEditing('city')}>
                       <Ionicons name="pencil" size={18} color="#6366f1" />
                   </TouchableOpacity>
                )}
            </View>

            {editing === 'city' ? (
                <View style={styles.citySelector}>
                    {CITIES.map(c => (
                        <TouchableOpacity 
                            key={c.id} 
                            style={[styles.cityButton, tempCity === c.id && styles.cityButtonActive]}
                            onPress={() => setTempCity(c.id)}
                        >
                            <Text style={[styles.cityButtonText, tempCity === c.id && styles.cityButtonTextActive]}>
                                {c.name}
                            </Text>
                            {tempCity === c.id && <Ionicons name="checkmark-circle" size={16} color="white" />}
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <Text style={styles.valueText}>{displayCity}</Text>
            )}
        </View>

        {/* === NAME === */}
        <View style={styles.section}>
            <View style={styles.labelRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="person" size={16} color="#64748b" />
                    <Text style={styles.label}>BENUTZERNAME</Text>
                </View>
                {editing === 'name' ? (
                   <View style={{flexDirection:'row', gap: 10}}>
                       <TouchableOpacity onPress={() => setEditing(null)}>
                           <Ionicons name="close" size={20} color="#f87171" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => handleSave('name')}>
                           <Ionicons name="checkmark" size={20} color="#4ade80" />
                       </TouchableOpacity>
                   </View>
                ) : (
                   <TouchableOpacity onPress={() => setEditing('name')}>
                       <Ionicons name="pencil" size={18} color="#6366f1" />
                   </TouchableOpacity>
                )}
            </View>
            {editing === 'name' ? (
                <View>
                    <TextInput 
                        style={styles.input} 
                        value={tempName} 
                        onChangeText={setTempName} 
                        autoCapitalize="none"
                    />
                    <Text style={styles.hint}>a-z, 0-9, . - _</Text>
                </View>
            ) : (
                <Text style={styles.valueText}>{tempName}</Text>
            )}
        </View>

        {/* === EMAIL === */}
        <View style={styles.section}>
            <View style={styles.labelRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="mail" size={16} color="#64748b" />
                    <Text style={styles.label}>E-MAIL</Text>
                </View>
                {editing === 'email' ? (
                   <View style={{flexDirection:'row', gap: 10}}>
                       <TouchableOpacity onPress={() => setEditing(null)}>
                           <Ionicons name="close" size={20} color="#f87171" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => handleSave('email')}>
                           <Ionicons name="checkmark" size={20} color="#4ade80" />
                       </TouchableOpacity>
                   </View>
                ) : (
                   <TouchableOpacity onPress={() => setEditing('email')}>
                       <Ionicons name="pencil" size={18} color="#6366f1" />
                   </TouchableOpacity>
                )}
            </View>
            {editing === 'email' ? (
                <TextInput 
                    style={styles.input} 
                    value={tempEmail} 
                    onChangeText={setTempEmail} 
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
            ) : (
                <Text style={styles.valueText}>{tempEmail}</Text>
            )}
        </View>

        {/* === PASSWORT === */}
        <View style={[styles.section, {borderBottomWidth: 0}]}>
            <View style={styles.labelRow}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="lock-closed" size={16} color="#64748b" />
                    <Text style={styles.label}>PASSWORT</Text>
                </View>
                {editing === 'password' ? (
                   <View style={{flexDirection:'row', gap: 10}}>
                       <TouchableOpacity onPress={() => setEditing(null)}>
                           <Ionicons name="close" size={20} color="#f87171" />
                       </TouchableOpacity>
                       <TouchableOpacity onPress={() => handleSave('password')}>
                           <Ionicons name="checkmark" size={20} color="#4ade80" />
                       </TouchableOpacity>
                   </View>
                ) : (
                   <TouchableOpacity onPress={() => { setEditing('password'); setTempPassword(""); }}>
                       <Ionicons name="pencil" size={18} color="#6366f1" />
                   </TouchableOpacity>
                )}
            </View>
            {editing === 'password' ? (
                <TextInput 
                    style={styles.input} 
                    value={tempPassword} 
                    onChangeText={setTempPassword} 
                    secureTextEntry
                    placeholder="Neues Passwort"
                    placeholderTextColor="#64748b"
                />
            ) : (
                <Text style={styles.valueText}>••••••••</Text>
            )}
        </View>
      </View>

      {/* BUTTONS */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutText}>Abmelden</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleDeleteAccount} style={{marginTop: 20, alignSelf: 'center'}}>
          <Text style={{color: '#ef4444', fontSize: 12}}>Account löschen</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  
  header: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 10, shadowColor: '#6366f1', shadowOpacity: 0.5, shadowRadius: 10 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: '#94a3b8' },
  
  card: { backgroundColor: '#1e293b', borderRadius: 20, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginLeft: 8 },
  valueText: { color: 'white', fontSize: 16, paddingLeft: 24 },
  
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#475569', borderRadius: 8, color: 'white', padding: 12, fontSize: 16, marginTop: 4 },
  hint: { color: '#64748b', fontSize: 10, marginTop: 4 },
  
  // City Selector Styles
  citySelector: { gap: 8, marginTop: 8 },
  cityButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  cityButtonActive: { borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  cityButtonText: { color: '#94a3b8' },
  cityButtonTextActive: { color: 'white', fontWeight: 'bold' },
  
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#334155', marginTop: 24, padding: 16, borderRadius: 16 },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});