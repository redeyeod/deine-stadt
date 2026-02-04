import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

const CITIES = [
  { id: "karlsruhe", name: "Karlsruhe", active: true },
  { id: "berlin", name: "Berlin", active: false },
  { id: "hamburg", name: "Hamburg", active: false },
  { id: "muenchen", name: "München", active: false },
];

export default function OnboardingScreen({ navigation }) {
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const handleSave = async () => {
    if (!user || !selectedCity) return;
    setLoading(true);

    try {
      // Stadt speichern
      await updateDoc(doc(db, "users", user.uid), {
        city: selectedCity
      });
      
      // Weiterleiten ins Dashboard (replace, damit man nicht zurück zum Onboarding kommt)
      navigation.replace("Dashboard");
    } catch (error) {
      console.error("Fehler:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      <View style={styles.header}>
        <View style={styles.iconBox}>
            <Ionicons name="map" size={32} color="#818cf8" />
        </View>
        <Text style={styles.title}>Wo bist du unterwegs?</Text>
        <Text style={styles.subtitle}>Wähle deine Stadt, um Events in deiner Nähe zu finden.</Text>
      </View>

      <View style={styles.grid}>
        {CITIES.map((city) => {
           const isSelected = selectedCity === city.id;
           const isDisabled = !city.active;

           return (
             <TouchableOpacity
                key={city.id}
                onPress={() => !isDisabled && setSelectedCity(city.id)}
                disabled={isDisabled}
                style={[
                    styles.card, 
                    isSelected && styles.cardSelected,
                    isDisabled && styles.cardDisabled
                ]}
             >
                <View style={styles.cardHeader}>
                    <Text style={[styles.cityName, isSelected && {color: 'white'}]}>{city.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color="#6366f1" />}
                </View>
                
                {!city.active && (
                    <Text style={styles.soonText}>BALD VERFÜGBAR</Text>
                )}
             </TouchableOpacity>
           );
        })}
      </View>

      <TouchableOpacity 
        onPress={handleSave} 
        disabled={!selectedCity || loading}
        style={[styles.button, (!selectedCity || loading) && styles.buttonDisabled]}
      >
        {loading ? <ActivityIndicator color="white" /> : (
            <>
                <Text style={styles.buttonText}>Los geht's</Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
            </>
        )}
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconBox: { width: 64, height: 64, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },

  grid: { width: '100%', gap: 12, marginBottom: 40 },
  
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#334155' },
  cardSelected: { borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  cardDisabled: { opacity: 0.5 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cityName: { fontSize: 18, fontWeight: 'bold', color: '#cbd5e1' },
  soonText: { fontSize: 10, fontWeight: 'bold', color: '#64748b', marginTop: 8 },

  button: { width: '100%', backgroundColor: '#6366f1', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  buttonDisabled: { backgroundColor: '#334155', opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});