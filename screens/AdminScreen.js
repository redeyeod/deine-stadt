import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function AdminScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllEvents = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Fehler", "Daten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  // Nutze useFocusEffect, damit die Liste aktuell ist, wenn man vom Editieren zurückkommt
  useFocusEffect(
    useCallback(() => {
      fetchAllEvents();
    }, [])
  );

  const handleApprove = async (item) => {
    try {
      if (item.originalId) {
        const originalDocRef = doc(db, "events", item.originalId);
        const { id, originalId, ...newData } = item;
        await updateDoc(originalDocRef, {
          ...newData,
          status: 'published',
          updatedAt: new Date()
        });
        await deleteDoc(doc(db, "events", item.id));
        Alert.alert("Genehmigt", "Das Original wurde aktualisiert.");
      } else {
        await updateDoc(doc(db, "events", item.id), { status: 'published' });
        Alert.alert("Genehmigt", "Event ist jetzt live.");
      }
      fetchAllEvents();
    } catch (e) {
      Alert.alert("Fehler", "Genehmigung fehlgeschlagen.");
    }
  };

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, "events", id), { status: 'rejected' });
      Alert.alert("Abgelehnt", "Status wurde geändert.");
      fetchAllEvents();
    } catch (e) {
      Alert.alert("Fehler", "Aktion fehlgeschlagen.");
    }
  };

  const handleDelete = (id) => {
    Alert.alert("Event löschen", "Soll dieses Event endgültig gelöscht werden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, "events", id));
          setEvents(prev => prev.filter(e => e.id !== id));
      }}
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Cockpit 🛡️</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === 'pending' && styles.pendingCard]}>
            
            {/* BADGES */}
            <View style={styles.statusBadgeRow}>
                <View style={[styles.badge, {backgroundColor: item.status === 'published' ? '#22c55e20' : '#f59e0b20'}]}>
                    <Text style={{color: item.status === 'published' ? '#22c55e' : '#f59e0b', fontSize: 10, fontWeight: 'bold'}}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
                {item.originalId && (
                    <View style={styles.updateBadge}>
                        <Text style={styles.updateBadgeText}>UPDATE-ANTRAG</Text>
                    </View>
                )}
            </View>
            
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardInfo}>{item.location} • {item.city}</Text>

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
              
              {/* Bereich 1: Genehmigung (Nur bei Pending) */}
              {item.status === 'pending' && (
                <View style={styles.approvalGroup}>
                  <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleApprove(item)}>
                    <Ionicons name="checkmark" size={18} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
                    <Ionicons name="close" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Bereich 2: Verwaltung (Immer für Admin) */}
              <View style={styles.managementGroup}>
                <TouchableOpacity 
                    style={[styles.btn, styles.editBtn]} 
                    onPress={() => navigation.navigate("EditEvent", { eventId: item.id })}
                >
                  <Ionicons name="pencil" size={18} color="white" />
                  <Text style={styles.btnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.btn, styles.deleteBtn]} 
                    onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { marginTop: 40, padding: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginLeft: 10 },
  backBtn: { padding: 8 },
  
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  pendingCard: { borderColor: '#f59e0b' },
  
  statusBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  updateBadge: { backgroundColor: '#3b82f6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  updateBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  
  cardTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cardInfo: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 15 },
  approvalGroup: { flexDirection: 'row', gap: 8, borderRightWidth: 1, borderRightColor: '#334155', paddingRight: 10 },
  managementGroup: { flexDirection: 'row', gap: 8, flex: 1 },
  
  btn: { height: 40, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  approveBtn: { backgroundColor: '#22c55e' },
  rejectBtn: { backgroundColor: '#ef4444' },
  editBtn: { backgroundColor: '#334155', flex: 1, gap: 6 },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});