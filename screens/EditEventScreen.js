import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const CITIES = [
  { id: "karlsruhe", name: "Karlsruhe" }
];

export default function EditEventScreen({ route, navigation }) {
  const { eventId } = route.params;
  const user = auth.currentUser;

  // Loading States
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Data States
  const [originalEvent, setOriginalEvent] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [categoriesList, setCategoriesList] = useState([]);

  // Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("karlsruhe");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  
  // Social Link States (NEU)
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");

  // Zeit-States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [showPicker, setShowPicker] = useState(null); 

  useEffect(() => {
    const loadData = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) setUserRole(userSnap.data().role || "user");

        const catQ = query(collection(db, "categories"), orderBy("name"));
        const catSnap = await getDocs(catQ);
        setCategoriesList(catSnap.docs.map(d => ({ id: d.id, name: d.data().name })));

        const eventSnap = await getDoc(doc(db, "events", eventId));
        if (!eventSnap.exists()) {
          Alert.alert("Fehler", "Event nicht gefunden.");
          navigation.goBack();
          return;
        }

        const data = eventSnap.data();
        setOriginalEvent({ id: eventSnap.id, ...data });

        setTitle(data.title || "");
        setCategory(data.category || "");
        setCity(data.city || "karlsruhe");
        setLocation(data.location || "");
        setDescription(data.description || "");
        setExistingImageUrl(data.image || "");
        setIsFree(data.isFree || data.price === "Kostenlos");
        setPrice(data.isFree ? "" : data.price || "");
        setIsAllDay(data.isAllDay || false);
        setIsMultiDay(data.isMultiDay || false);
        
        // Links laden (NEU)
        if (data.links) {
          setInstagram(data.links.instagram || "");
          setYoutube(data.links.youtube || "");
          setWebsite(data.links.website || "");
        }

        if (data.startDate?.seconds) setStartDate(new Date(data.startDate.seconds * 1000));
        if (data.endDate?.seconds) setEndDate(new Date(data.endDate.seconds * 1000));

      } catch (error) {
        console.error(error);
        Alert.alert("Fehler", "Laden fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventId]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = (e) => reject(new TypeError("Network request failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
    const fileRef = ref(storage, `eventImages/${Date.now()}_${user.uid}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const onChangeDate = (event, selectedDate, type) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (selectedDate) {
      if (type === 'start' || type === 'startTime') setStartDate(selectedDate);
      if (type === 'end') setEndDate(selectedDate);
    }
  };

  const handleDelete = () => {
    Alert.alert("Löschen", "Dieses Event wirklich löschen?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Löschen", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, "events", eventId));
            navigation.goBack();
          } catch (e) { Alert.alert("Fehler", "Löschen fehlgeschlagen."); }
      }}
    ]);
  };

  const handleSave = async () => {
    if (!title || !location) {
      Alert.alert("Fehler", "Bitte Titel und Ort angeben.");
      return;
    }
    setSaveLoading(true);
    try {
      let finalImageUrl = existingImageUrl;
      if (image) {
        finalImageUrl = await uploadImageAsync(image);
      }

      const updateData = {
        title, category, city, location, description,
        image: finalImageUrl,
        price: isFree ? "Kostenlos" : price,
        isFree,
        startDate: Timestamp.fromDate(startDate),
        endDate: isMultiDay ? Timestamp.fromDate(endDate) : Timestamp.fromDate(startDate),
        isAllDay, isMultiDay,
        links: {
          instagram: instagram || null,
          youtube: youtube || null,
          website: website || null
        },
        updatedAt: Timestamp.now(),
      };

      if (userRole === 'admin' || originalEvent.status === 'pending') {
        await updateDoc(doc(db, "events", eventId), updateData);
        Alert.alert("Erfolg", "Event aktualisiert.");
      } else {
        await addDoc(collection(db, "events"), {
          ...updateData,
          authorId: user.uid,
          status: 'pending',
          originalId: eventId,
          createdAt: Timestamp.now()
        });
        Alert.alert("Eingereicht", "Änderungen werden geprüft.");
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("Fehler", "Speichern fehlgeschlagen.");
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return (
    <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6366f1" /></View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bearbeiten</Text>
        <TouchableOpacity onPress={handleDelete} style={[styles.headerIconBtn, {backgroundColor: 'rgba(239, 68, 68, 0.1)'}]}>
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Titel & Kategorie</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#64748b" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {categoriesList.map((cat) => (
              <TouchableOpacity key={cat.id} style={[styles.catChip, category === cat.id && styles.catChipActive]} onPress={() => setCategory(cat.id)}>
                <Text style={[styles.catChipText, category === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Event Bild</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            {image || existingImageUrl ? (
              <Image source={{ uri: image || existingImageUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={32} color="#64748b" />
                <Text style={styles.imagePlaceholderText}>Bild ändern</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Stadt</Text>
          <View style={{flexDirection: 'row'}}>
            {CITIES.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.catChip, city === c.id && styles.cityChipActive]} onPress={() => setCity(c.id)}>
                <Text style={[styles.catChipText, city === c.id && styles.cityTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Zeitraum</Text>
          <View style={styles.toggleRow}><Text style={styles.toggleText}>Ganztägig</Text><Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: '#6366f1' }} /></View>
          <View style={styles.toggleRow}><Text style={styles.toggleText}>Mehrere Tage</Text><Switch value={isMultiDay} onValueChange={setIsMultiDay} trackColor={{ true: '#6366f1' }} /></View>

          <View style={styles.timeSelectionRow}>
            <TouchableOpacity style={[styles.timeBox, showPicker === 'start' && styles.timeBoxActive]} onPress={() => setShowPicker('start')}>
              <Ionicons name="calendar-outline" size={16} color="#6366f1" />
              <View><Text style={styles.timeBoxLabel}>{isMultiDay ? "Beginn" : "Datum"}</Text><Text style={styles.timeBoxValue}>{startDate.toLocaleDateString('de-DE')}</Text></View>
            </TouchableOpacity>

            {!isAllDay && (
              <TouchableOpacity style={[styles.timeBox, showPicker === 'startTime' && styles.timeBoxActive]} onPress={() => setShowPicker('startTime')}>
                <Ionicons name="time-outline" size={16} color="#6366f1" />
                <View><Text style={styles.timeBoxLabel}>Uhrzeit</Text><Text style={styles.timeBoxValue}>{startDate.toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}</Text></View>
              </TouchableOpacity>
            )}
          </View>

          {isMultiDay && (
            <TouchableOpacity style={[styles.timeBox, {marginTop: 12}, showPicker === 'end' && styles.timeBoxActive]} onPress={() => setShowPicker('end')}>
              <Ionicons name="calendar-outline" size={16} color="#6366f1" />
              <View><Text style={styles.timeBoxLabel}>Ende am</Text><Text style={styles.timeBoxValue}>{endDate.toLocaleDateString('de-DE')}</Text></View>
            </TouchableOpacity>
          )}

          {showPicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerInner}>
                <DateTimePicker 
                  value={showPicker === 'end' ? endDate : startDate} 
                  mode={showPicker === 'startTime' ? 'time' : 'date'} 
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  is24Hour={true} textColor="black"
                  onChange={(e, d) => onChangeDate(e, d, showPicker)} 
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity onPress={() => setShowPicker(null)} style={styles.confirmPickerBtn}><Text style={styles.confirmPickerText}>OK</Text></TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* SOCIAL LINKS SEKTION (NEU) */}
        <View style={styles.section}>
          <Text style={styles.label}>Social Media & Links (Optional)</Text>
          <View style={styles.linkInputRow}>
            <Ionicons name="logo-instagram" size={20} color="#E4405F" style={styles.linkIcon} />
            <TextInput 
              style={[styles.input, styles.linkInput]} 
              placeholder="Instagram URL" 
              placeholderTextColor="#64748b" 
              value={instagram} 
              onChangeText={setInstagram} 
              autoCapitalize="none"
            />
          </View>
          <View style={styles.linkInputRow}>
            <Ionicons name="logo-youtube" size={20} color="#FF0000" style={styles.linkIcon} />
            <TextInput 
              style={[styles.input, styles.linkInput]} 
              placeholder="YouTube URL" 
              placeholderTextColor="#64748b" 
              value={youtube} 
              onChangeText={setYoutube} 
              autoCapitalize="none"
            />
          </View>
          <View style={styles.linkInputRow}>
            <Ionicons name="globe-outline" size={20} color="#6366f1" style={styles.linkIcon} />
            <TextInput 
              style={[styles.input, styles.linkInput]} 
              placeholder="Website / Tickets URL" 
              placeholderTextColor="#64748b" 
              value={website} 
              onChangeText={setWebsite} 
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Details & Ort</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Ort" placeholderTextColor="#64748b" />
          <TextInput style={[styles.input, styles.textArea]} multiline value={description} onChangeText={setDescription} placeholder="Beschreibung" placeholderTextColor="#64748b" />
          
          <View style={styles.priceRow}>
            <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} editable={!isFree} placeholder="Preis" placeholderTextColor="#64748b" value={isFree ? "Kostenlos" : price} onChangeText={setPrice} />
            <TouchableOpacity style={[styles.freeButton, isFree && styles.freeButtonActive]} onPress={() => setIsFree(!isFree)}>
              <Text style={[styles.freeButtonText, isFree && styles.freeButtonTextActive]}>Gratis</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveLoading}>
          {saveLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Änderungen speichern</Text>}
        </TouchableOpacity>
        
        <View style={{height: 60}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b' },
  headerIconBtn: { padding: 10, backgroundColor: '#334155', borderRadius: 14 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 35 }, 
  label: { color: '#6366f1', fontSize: 12, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: '#1e293b', borderRadius: 15, padding: 18, color: 'white', fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 15 },
  textArea: { height: 120, textAlignVertical: 'top' },
  catScroll: { marginTop: 5 },
  catChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e293b', marginRight: 10, borderWidth: 1, borderColor: '#334155' },
  catChipActive: { backgroundColor: '#6366f1', borderColor: '#818cf8' },
  cityChipActive: { backgroundColor: '#22c55e', borderColor: '#4ade80' },
  catChipText: { color: '#94a3b8', fontSize: 14 },
  catChipTextActive: { color: 'white', fontWeight: 'bold' },
  cityTextActive: { color: 'white', fontWeight: 'bold' },
  imagePickerBtn: { backgroundColor: '#1e293b', height: 180, borderRadius: 20, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { color: '#64748b', marginTop: 10, fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  toggleText: { color: 'white', fontSize: 16, fontWeight: '500' },
  timeSelectionRow: { flexDirection: 'row', gap: 15 },
  timeBox: { flex: 1, backgroundColor: '#1e293b', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeBoxActive: { borderColor: '#6366f1', backgroundColor: '#6366f110' },
  timeBoxLabel: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  timeBoxValue: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  pickerContainer: { marginTop: 10, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#6366f1' },
  pickerInner: { backgroundColor: '#f1f5f9' },
  confirmPickerBtn: { backgroundColor: '#6366f1', padding: 15, alignItems: 'center' },
  confirmPickerText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  priceRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  freeButton: { paddingHorizontal: 20, height: 58, borderRadius: 15, backgroundColor: '#1e293b', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  freeButtonActive: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  freeButtonText: { color: '#94a3b8', fontWeight: 'bold' },
  freeButtonTextActive: { color: '#22c55e' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  // Social Styles (NEU)
  linkInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  linkIcon: { width: 30, marginRight: 10 },
  linkInput: { flex: 1, marginBottom: 0 }
});