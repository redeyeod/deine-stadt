import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function MyEventsScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const user = auth.currentUser;

  const checkRoleAndFetch = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Rolle aus Firestore abrufen & Zugriffsschutz
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const role = userData.role || 'user';

        // ZUGRIFFSSCHUTZ: Wenn keine Berechtigung, schicke User weg
        if (role !== 'admin' && role !== 'creator') {
          setLoading(false);
          Alert.alert("Zugriff verweigert", "Du hast keine Berechtigung, Events zu verwalten.");
          navigation.navigate("Entdecken");
          return;
        }

        setIsAdmin(role === 'admin');
      } else {
        // Falls gar kein User-Dokument existiert
        navigation.navigate("Entdecken");
        return;
      }

      // 2. Eigene Events laden
      const q = query(
        collection(db, "events"),
        where("authorId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(list);
    } catch (error) {
      console.error("Fehler im MyEventsScreen:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkRoleAndFetch();
    }, [user])
  );

  const handleDelete = (id) => {
    Alert.alert(
      "Event löschen?",
      "Möchtest du dieses Event wirklich löschen?",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Löschen", style: "destructive", onPress: async () => {
            try {
                await deleteDoc(doc(db, "events", id));
                setEvents(prev => prev.filter(e => e.id !== id));
            } catch (e) {
                Alert.alert("Fehler", "Löschen fehlgeschlagen.");
            }
        }}
      ]
    );
  };

  if (!user) return <View style={styles.center}><Text style={{color:'white'}}>Bitte einloggen.</Text></View>;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{flex: 1}}>
            <Text style={styles.title}>Meine Events</Text>
            <Text style={styles.subtitle}>Verwalte deine Einträge</Text>
        </View>
        
        <View style={styles.headerActionGroup}>
            {isAdmin && (
                <TouchableOpacity 
                    style={[styles.headerIconBtn, {backgroundColor: '#ef4444'}]} 
                    onPress={() => navigation.navigate("Admin")}
                >
                    <Ionicons name="shield-checkmark" size={22} color="white" />
                </TouchableOpacity>
            )}

            <TouchableOpacity 
                style={[styles.headerIconBtn, {backgroundColor: '#6366f1'}]} 
                onPress={() => navigation.navigate("CreateEvent")}
            >
                <Ionicons name="add" size={28} color="white" />
            </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#6366f1" size="large"/></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          contentContainerStyle={{paddingBottom: 100}} // Mehr Platz für die Floating-Bar
          renderItem={({ item }) => (
            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <View style={styles.imageBox}>
                        {item.image ? (
                            <Image source={{uri: item.image}} style={styles.image} />
                        ) : (
                            <Ionicons name="calendar" size={24} color="#64748b" />
                        )}
                    </View>
                    
                    <View style={{flex: 1}}>
                        <View style={styles.statusRow}>
                            {item.status === 'published' && <StatusBadge color="#22c55e" text="Live" />}
                            {item.status === 'pending' && <StatusBadge color="#f59e0b" text="Prüfung" />}
                            {item.status === 'rejected' && <StatusBadge color="#ef4444" text="Abgelehnt" />}
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardDate}>
                            {item.startDate?.seconds ? new Date(item.startDate.seconds * 1000).toLocaleDateString("de-DE") : "Demnächst"}
                        </Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => navigation.navigate("EditEvent", { eventId: item.id })}
                    >
                        <Ionicons name="pencil" size={16} color="white" />
                        <Text style={styles.actionText}>Bearbeiten</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.actionButton, {backgroundColor: 'rgba(239, 68, 68, 0.1)'}]}
                        onPress={() => handleDelete(item.id)}
                    >
                        <Ionicons name="trash" size={16} color="#ef4444" />
                        <Text style={[styles.actionText, {color: '#ef4444'}]}>Löschen</Text>
                    </TouchableOpacity>
                </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={{color: '#94a3b8', marginBottom: 12}}>Keine Events vorhanden.</Text>
                <TouchableOpacity onPress={() => navigation.navigate("CreateEvent")}>
                    <Text style={{color: '#818cf8', fontWeight: 'bold'}}>Erstelle dein erstes Event</Text>
                </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

function StatusBadge({ color, text }) {
    return (
        <View style={{backgroundColor: color + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 4, borderWidth: 1, borderColor: color + '40'}}>
            <Text style={{color: color, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase'}}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginTop: 60, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActionGroup: { flexDirection: 'row', gap: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#94a3b8' },
  headerIconBtn: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOpacity: 0.3, 
    shadowRadius: 5, 
    elevation: 4 
  },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  imageBox: { width: 70, height: 70, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  statusRow: { flexDirection: 'row', marginBottom: 2 },
  cardTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  cardDate: { color: '#94a3b8', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#334155', padding: 10, borderRadius: 8 },
  actionText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  emptyState: { padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155', borderRadius: 16, marginTop: 20 }
});