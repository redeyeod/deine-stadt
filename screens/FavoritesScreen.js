import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
// 1. expo-image importieren
import { Image } from 'expo-image'; 

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const fetchFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const favRef = collection(db, "users", user.uid, "favorites");
      const favSnap = await getDocs(favRef);
      const favIds = favSnap.docs.map(doc => doc.id);

      if (favIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      const eventPromises = favIds.map(id => getDoc(doc(db, "events", id)));
      const eventSnaps = await Promise.all(eventPromises);
      
      const eventList = eventSnaps
        .filter(snap => snap.exists())
        .map(snap => ({ id: snap.id, ...snap.data() }));

      setFavorites(eventList);
    } catch (error) {
      console.error("Fehler beim Laden der Favoriten:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [user])
  );

  const renderEventItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('EventDetail', { event: item })}
    >
      {item.image ? (
        // 2. expo-image Komponente nutzen
        <Image 
          source={item.image} // expo-image erkennt automatisch, ob es eine URI ist
          style={styles.image}
          contentFit="cover" // Ersetzt resizeMode
          transition={400} // Sanftes Einblenden (400ms)
          cachePolicy="memory-disk" // Speichert das Bild dauerhaft auf dem Gerät
        />
      ) : (
        <View style={[styles.image, styles.placeholderBox]}>
          <Ionicons name="image-outline" size={30} color="#475569" />
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#94a3b8" />
          <Text style={styles.infoText}>
            {item.startDate?.seconds ? new Date(item.startDate.seconds * 1000).toLocaleDateString("de-DE") : "Demnächst"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#94a3b8" />
          <Text style={styles.infoText} numberOfLines={1}>{item.location || "Karlsruhe"}</Text>
        </View>
      </View>
      <View style={styles.heartBadge}>
        <Ionicons name="heart" size={20} color="#ef4444" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Meine Favoriten</Text>
      
      <FlatList
        data={favorites}
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={60} color="#334155" />
            <Text style={styles.emptyText}>Noch keine Favoriten gespeichert.</Text>
            <TouchableOpacity 
              style={styles.exploreBtn}
              onPress={() => navigation.navigate('Entdecken')}
            >
              <Text style={styles.exploreBtnText}>Events entdecken</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 60, paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  listContent: { paddingBottom: 100 },
  card: { 
    backgroundColor: '#1e293b', 
    borderRadius: 16, 
    flexDirection: 'row', 
    marginBottom: 16, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155'
  },
  image: { width: 100, height: 100 },
  placeholderBox: { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  cardContent: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { color: '#94a3b8', fontSize: 13 },
  heartBadge: { padding: 12, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 16, textAlign: 'center' },
  exploreBtn: { marginTop: 20, backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  exploreBtnText: { color: 'white', fontWeight: 'bold' }
});