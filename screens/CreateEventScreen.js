import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Switch, Platform, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

const CITIES = [
  { id: "karlsruhe", name: "Karlsruhe" },
];

export default function CreateEventScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const user = auth.currentUser;

  // Form States
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("karlsruhe"); 
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isFree, setIsFree] = useState(false);
  
  // Link States (NEU)
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");
  
  // Date States
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [showPicker, setShowPicker] = useState(null); 
  
  const [categoriesList, setCategoriesList] = useState([]);

  useEffect(() => {
    const loadCats = async () => {
        try {
            const q = query(collection(db, "categories"), orderBy("name"));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({id: d.id, name: d.data().name}));
            setCategoriesList(list);
            if(list.length > 0) setCategory(list[0].id);
        } catch(e) { console.error(e); }
    };
    loadCats();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () { resolve(xhr.response); };
      xhr.onerror = function (e) { reject(new TypeError("Network request failed")); };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const fileRef = ref(storage, `eventImages/${Date.now()}_${user.uid}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const handleSubmit = async () => {
    if (!title || !location || !description) return Alert.alert("Fehler", "Bitte fülle die Pflichtfelder aus.");
    setLoading(true);

    try {
      let finalImageUrl = null;
      if (image) {
        finalImageUrl = await uploadImageAsync(image);
      }

      await addDoc(collection(db, "events"), {
        title,
        startDate: Timestamp.fromDate(startDate),
        endDate: isMultiDay ? Timestamp.fromDate(endDate) : Timestamp.fromDate(startDate),
        isAllDay,
        isMultiDay,
        location,
        city,
        category,
        description,
        image: finalImageUrl,
        isFree,
        price: isFree ? "Kostenlos" : price,
        // Links hinzufügen (NEU)
        links: {
          instagram: instagram || null,
          youtube: youtube || null,
          website: website || null
        },
        authorId: user.uid,
        status: "pending", 
        createdAt: Timestamp.now()
      });
      Alert.alert("Erfolg 🎉", "Dein Event wurde zur Prüfung eingereicht!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) { 
        Alert.alert("Fehler", e.message); 
    } finally { 
        setLoading(false); 
    }
  };

  const onChangeDate = (event, selectedDate, type) => {
    if (Platform.OS === 'android') setShowPicker(null);
    if (selectedDate) {
      if (type === 'start' || type === 'startTime') setStartDate(selectedDate);
      if (type === 'end') setEndDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neues Event</Text>
        <View style={{width: 48}} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* TITEL & KATEGORIE */}
        <View style={styles.section}>
            <Text style={styles.label}>Titel & Kategorie</Text>
            <TextInput style={styles.input} placeholder="Event Name" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categoriesList.map((cat) => (
                    <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.catChip, category === cat.id && styles.catChipActive]} 
                        onPress={() => setCategory(cat.id)}
                    >
                        <Text style={[styles.catChipText, category === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* BILD UPLOAD */}
        <View style={styles.section}>
            <Text style={styles.label}>Event Bild</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="camera" size={32} color="#64748b" />
                        <Text style={styles.imagePlaceholderText}>Bild auswählen</Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>

        {/* STADT AUSWAHL */}
        <View style={styles.section}>
            <Text style={styles.label}>Stadt wählen</Text>
            <View style={{flexDirection: 'row'}}>
                {CITIES.map((c) => (
                    <TouchableOpacity 
                        key={c.id} 
                        style={[styles.catChip, city === c.id && styles.cityChipActive]} 
                        onPress={() => setCity(c.id)}
                    >
                        <Text style={[styles.catChipText, city === c.id && styles.cityTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* ZEITRAUM */}
        <View style={styles.section}>
            <Text style={styles.label}>Zeitraum</Text>
            <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>Ganztägig</Text>
                <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: '#6366f1' }} />
            </View>
            <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>Mehrere Tage</Text>
                <Switch value={isMultiDay} onValueChange={setIsMultiDay} trackColor={{ true: '#6366f1' }} />
            </View>

            <View style={styles.timeSelectionRow}>
                <TouchableOpacity style={[styles.timeBox, (showPicker === 'start') && styles.timeBoxActive]} onPress={() => setShowPicker('start')}>
                    <Ionicons name="calendar-outline" size={16} color="#6366f1" />
                    <View>
                        <Text style={styles.timeBoxLabel}>{isMultiDay ? "Beginn" : "Datum"}</Text>
                        <Text style={styles.timeBoxValue}>{startDate.toLocaleDateString('de-DE')}</Text>
                    </View>
                </TouchableOpacity>

                {!isAllDay && (
                    <TouchableOpacity style={[styles.timeBox, showPicker === 'startTime' && styles.timeBoxActive]} onPress={() => setShowPicker('startTime')}>
                        <Ionicons name="time-outline" size={16} color="#6366f1" />
                        <View>
                            <Text style={styles.timeBoxLabel}>Uhrzeit</Text>
                            <Text style={styles.timeBoxValue}>{startDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </View>

            {isMultiDay && (
                <TouchableOpacity style={[styles.timeBox, {marginTop: 12}, showPicker === 'end' && styles.timeBoxActive]} onPress={() => setShowPicker('end')}>
                    <Ionicons name="calendar-outline" size={16} color="#6366f1" />
                    <View>
                        <Text style={styles.timeBoxLabel}>Ende am</Text>
                        <Text style={styles.timeBoxValue}>{endDate.toLocaleDateString('de-DE')}</Text>
                    </View>
                </TouchableOpacity>
            )}

            {showPicker && (
                <View style={styles.pickerContainer}>
                    <View style={styles.pickerInner}>
                        <DateTimePicker 
                            value={showPicker === 'end' ? endDate : startDate} 
                            mode={showPicker === 'startTime' ? 'time' : 'date'} 
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            is24Hour={true} 
                            textColor="black"
                            onChange={(e, d) => onChangeDate(e, d, showPicker)} 
                        />
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity onPress={() => setShowPicker(null)} style={styles.confirmPickerBtn}>
                                <Text style={styles.confirmPickerText}>Auswahl übernehmen</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </View>

        {/* LINKS SEKTION (NEU) */}
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

        {/* DETAILS & ORT */}
        <View style={styles.section}>
            <Text style={styles.label}>Details & Ort</Text>
            <TextInput style={styles.input} placeholder="Ort / Location" placeholderTextColor="#64748b" value={location} onChangeText={setLocation} />
            <TextInput style={[styles.input, styles.textArea]} multiline placeholder="Beschreibung..." placeholderTextColor="#64748b" value={description} onChangeText={setDescription} />
            
            <View style={styles.priceRow}>
                <TextInput 
                    style={[styles.input, {flex: 1, marginBottom: 0}]} 
                    placeholder="Preis (z.B. 15€)" 
                    editable={!isFree}
                    placeholderTextColor="#64748b" 
                    value={isFree ? "Kostenlos" : price} 
                    onChangeText={setPrice} 
                />
                <TouchableOpacity 
                    style={[styles.freeButton, isFree && styles.freeButtonActive]} 
                    onPress={() => setIsFree(!isFree)}
                >
                    <Text style={[styles.freeButtonText, isFree && styles.freeButtonTextActive]}>Gratis</Text>
                </TouchableOpacity>
            </View>
        </View>

        <TouchableOpacity onPress={handleSubmit} disabled={loading} style={styles.submitBtn}>
            {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>Event einreichen</Text>}
        </TouchableOpacity>

        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1e293b' },
  headerIconBtn: { padding: 10, backgroundColor: '#334155', borderRadius: 14 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
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
  imagePlaceholderText: { color: '#64748b', marginTop: 10, fontSize: 14, fontWeight: '500' },
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
  submitBtn: { backgroundColor: '#6366f1', padding: 20, borderRadius: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  // Link Styles (NEU)
  linkInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  linkIcon: { width: 30, marginRight: 10 },
  linkInput: { flex: 1, marginBottom: 0 }
});