import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, Alert, Share, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
// 1. expo-image importieren
import { Image } from 'expo-image'; 

export default function EventDetailScreen({ route, navigation }) {
  const { event } = route.params;
  const [authorName, setAuthorName] = useState("Lädt...");
  const [isModalVisible, setModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchAuthorName = async () => {
      try {
        if (event.authorId) {
          const userSnap = await getDoc(doc(db, "users", event.authorId));
          if (userSnap.exists()) {
            setAuthorName(userSnap.data().name || "Unbekannter User");
          }
        }
      } catch (error) { 
        setAuthorName("Unbekannt"); 
      }
    };

    let unsubscribeFav = () => {};
    if (user) {
      const favDocRef = doc(db, "users", user.uid, "favorites", event.id);
      unsubscribeFav = onSnapshot(favDocRef, (doc) => {
        setIsFavorite(doc.exists());
      });
    }

    fetchAuthorName();
    return () => unsubscribeFav();
  }, [event.authorId, event.id, user]);

  const toggleFavorite = async () => {
    if (!user) {
      Alert.alert("Anmelden", "Bitte logge dich ein, um Favoriten zu speichern.");
      return;
    }
    const favDocRef = doc(db, "users", user.uid, "favorites", event.id);
    try {
      if (isFavorite) {
        await deleteDoc(favDocRef);
      } else {
        await setDoc(favDocRef, { addedAt: new Date() });
      }
    } catch (error) {
      Alert.alert("Fehler", "Favoriten-Status konnte nicht geändert werden.");
    }
  };

  const formatEventDate = () => {
    const start = event.startDate?.seconds ? new Date(event.startDate.seconds * 1000) : new Date();
    const end = event.endDate?.seconds ? new Date(event.endDate.seconds * 1000) : start;
    if (event.isMultiDay) {
      const startStr = start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
      const endStr = end.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
      return `${startStr}. – ${endStr}`;
    } else {
      return start.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }
  };

  const formatEventTime = () => {
    if (event.isAllDay) return "Ganztägig";
    const start = event.startDate?.seconds ? new Date(event.startDate.seconds * 1000) : new Date();
    return start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + " Uhr";
  };

  const confirmCalendarAdd = () => {
    Alert.alert(
      "Termin speichern",
      `Möchtest du "${event.title}" am ${formatEventDate()} in deinen Kalender eintragen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Hinzufügen", onPress: addToCalendar }
      ]
    );
  };

  const addToCalendar = async () => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Zugriff verweigert", "Kalender-Berechtigung wird benötigt.");
        return;
      }
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = Platform.OS === 'ios' 
        ? await Calendar.getDefaultCalendarAsync()
        : calendars.find(c => c.isPrimary) || calendars[0];

      const start = event.startDate?.seconds ? new Date(event.startDate.seconds * 1000) : new Date();
      let end = event.endDate?.seconds ? new Date(event.endDate.seconds * 1000) : new Date(start.getTime() + 7200000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: event.title,
        startDate: start,
        endDate: end,
        allDay: event.isAllDay,
        location: `${event.location}, ${event.city}`,
        notes: event.description,
      });
      Alert.alert("Erfolg", "Termin wurde gespeichert! 🗓️");
    } catch (error) {
      Alert.alert("Fehler", "Speichern fehlgeschlagen.");
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check das Event: ${event.title}\n🗓️ ${formatEventDate()}\n📍 ${event.location}\n\nErstellt von: ${authorName}`,
      });
    } catch (e) { console.log(e); }
  };

  const openMaps = () => {
    const latLng = `${event.location}, ${event.city}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${latLng}`,
      android: `geo:0,0?q=${latLng}`
    });
    Linking.openURL(url);
  };

  const openLink = (url) => {
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      
      <Modal visible={isModalVisible} transparent={false} animationType="fade">
        <View style={styles.fullScreenModal}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setModalVisible(false)}>
            <Ionicons name="close-circle" size={45} color="white" />
          </TouchableOpacity>
          {/* 2. Modal-Image auf expo-image umgestellt */}
          <Image 
            source={event.image} 
            style={styles.fullImage} 
            contentFit="contain" 
            cachePolicy="memory-disk"
          />
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity activeOpacity={0.9} onPress={() => event.image && setModalVisible(true)} style={styles.imageContainer}>
          {event.image ? (
            // 3. Hauptbild auf expo-image umgestellt
            <Image 
                source={event.image} 
                style={styles.image} 
                contentFit="cover"
                transition={400}
                cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="images-outline" size={60} color="#334155" />
            </View>
          )}
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.actionCircle} onPress={onShare}>
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionCircle} onPress={toggleFavorite}>
              <Ionicons 
                name={isFavorite ? "heart" : "heart-outline"} 
                size={24} 
                color={isFavorite ? "#ef4444" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.authorRow}>
            <Ionicons name="person-circle-outline" size={18} color="#6366f1" />
            <Text style={styles.authorLabel}>Von: <Text style={{color: 'white'}}>{authorName}</Text></Text>
          </View>

          <Text style={styles.title}>{event.title}</Text>
          
          <View style={styles.tagContainer}>
            <View style={styles.categoryBadge}><Text style={styles.categoryText}>{event.category || "Event"}</Text></View>
            <Text style={styles.priceText}>{event.isFree ? "Gratis" : event.price}</Text>
          </View>

          <View style={styles.infoSection}>
            <TouchableOpacity style={styles.infoCard} onPress={confirmCalendarAdd} activeOpacity={0.7}>
                <View style={styles.iconBox}><Ionicons name="calendar" size={24} color="#6366f1" /></View>
                <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{formatEventDate()}</Text>
                    <Text style={styles.infoSubLabel}>{formatEventTime()} • In Kalender?</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color="#6366f1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoCard} onPress={openMaps} activeOpacity={0.7}>
                <View style={styles.iconBox}><Ionicons name="location" size={24} color="#ef4444" /></View>
                <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>{event.location}</Text>
                    <Text style={styles.infoSubLabel}>{event.city} • In Maps öffnen</Text>
                </View>
                <Ionicons name="map-outline" size={22} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.description}>{event.description}</Text>

          {event.links && (event.links.instagram || event.links.youtube || event.links.website) && (
            <View style={styles.socialContainer}>
              <Text style={styles.socialHeader}>Links & Kanäle</Text>
              <View style={styles.socialRow}>
                {event.links.instagram && (
                  <TouchableOpacity 
                    style={[styles.socialCircle, { backgroundColor: 'rgba(228, 64, 95, 0.15)' }]} 
                    onPress={() => openLink(event.links.instagram)}
                  >
                    <Ionicons name="logo-instagram" size={26} color="#E4405F" />
                  </TouchableOpacity>
                )}
                {event.links.youtube && (
                  <TouchableOpacity 
                    style={[styles.socialCircle, { backgroundColor: 'rgba(255, 0, 0, 0.15)' }]} 
                    onPress={() => openLink(event.links.youtube)}
                  >
                    <Ionicons name="logo-youtube" size={26} color="#FF0000" />
                  </TouchableOpacity>
                )}
                {event.links.website && (
                  <TouchableOpacity 
                    style={[styles.socialCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]} 
                    onPress={() => openLink(event.links.website)}
                  >
                    <Ionicons name="globe-outline" size={26} color="#6366f1" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  fullScreenModal: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  imageContainer: { width: '100%', height: 350, position: 'relative' },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 15, zIndex: 10 },
  topActions: { position: 'absolute', top: 60, right: 20, flexDirection: 'row', gap: 10, zIndex: 10 },
  actionCircle: { backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 15 },
  content: { backgroundColor: '#0f172a', marginTop: -30, borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  authorLabel: { color: '#94a3b8', fontSize: 13 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  categoryBadge: { backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  categoryText: { color: '#818cf8', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 11 },
  priceText: { color: '#22c55e', fontSize: 18, fontWeight: 'bold' },
  infoSection: { gap: 15, marginBottom: 30 },
  infoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
  iconBox: { width: 50, height: 50, backgroundColor: '#0f172a', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoTextContainer: { flex: 1 },
  infoLabel: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  infoSubLabel: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: 'white', marginBottom: 10 },
  description: { color: '#cbd5e1', fontSize: 16, lineHeight: 26, marginBottom: 25 },
  socialContainer: { alignItems: 'center', marginTop: 10, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1e293b' },
  socialHeader: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 25 },
  socialCircle: { width: 55, height: 55, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
});