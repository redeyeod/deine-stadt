import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, RefreshControl, TextInput, ScrollView } from 'react-native';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { collection, getDocs, doc, getDoc, query, where, orderBy } from 'firebase/firestore'; 
import { db, auth } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image'; 

const CITIES = {
  karlsruhe: "Karlsruhe",
  berlin: "Berlin",
  hamburg: "Hamburg",
  muenchen: "München"
};

export default function HomeScreen() {
  const navigation = useNavigation();
  
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState({}); 
  const [categoriesList, setCategoriesList] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [userName, setUserName] = useState("User"); 
  const [userCity, setUserCity] = useState(null); 
  const [activeFilter, setActiveFilter] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const catSnapshot = await getDocs(query(collection(db, "categories"), orderBy("name")));
        const catMap = {};
        const catArr = [];
        catSnapshot.docs.forEach(doc => { 
          catMap[doc.id] = doc.data().name; 
          catArr.push({ id: doc.id, name: doc.data().name });
        });
        setCategories(catMap);
        setCategoriesList(catArr);

        if (auth.currentUser) {
            const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                setUserName(data.name ? data.name.split(' ')[0] : "User");
                if (data.city) {
                    setUserCity(data.city);      
                    setActiveFilter(data.city);  
                }
            }
        }
        setInitialLoadDone(true);
      } catch (e) {
        console.error(e);
        setInitialLoadDone(true);
      }
    };
    loadInitialData();
  }, []);

  const fetchEvents = async () => {
    if (!initialLoadDone) return;
    setLoading(true);
    try {
      let q;
      if (activeFilter) {
        q = query(collection(db, "events"), where("city", "==", activeFilter), where("status", "==", "published"));
      } else {
        q = query(collection(db, "events"), where("status", "==", "published"));
      }
      const eventSnapshot = await getDocs(q);
      const list = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (a.startDate?.seconds || 0) - (b.startDate?.seconds || 0));
      setEvents(list);
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchEvents(); }, [activeFilter, initialLoadDone]);

  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const title = ev.title || "";
      const loc = ev.location || "";
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           loc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === "all" || ev.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [events, searchQuery, selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [activeFilter, initialLoadDone]);

  if (!initialLoadDone && loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1"/></View>;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
            <View>
              <Text style={styles.greeting}>Hallo, {userName} 👋</Text>
              <View style={styles.locationBadgeContainer}>
                <Ionicons name="location" size={14} color={activeFilter ? "#6366f1" : "#94a3b8"} />
                <Text style={[styles.locationBadgeText, activeFilter && styles.locationActiveText]}>
                  {activeFilter ? CITIES[activeFilter] : "Alle Städte"}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
                onPress={() => setShowFilters(!showFilters)} 
                style={[styles.iconBtn, showFilters && styles.iconBtnActive]}
            >
                <Ionicons name={showFilters ? "options" : "options-outline"} size={22} color={showFilters ? "white" : "#94a3b8"} />
            </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput 
                style={styles.searchInput}
                placeholder="Events suchen..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>

        {showFilters && (
            <View style={styles.expandableFilters}>
                <Text style={styles.filterLabel}>Region:</Text>
                <View style={styles.filterRow}>
                    <TouchableOpacity 
                        onPress={() => setActiveFilter(null)} 
                        style={[styles.miniChip, !activeFilter && styles.miniChipActive]}
                    >
                        <Text style={[styles.miniChipText, !activeFilter && styles.miniChipTextActive]}>Alle Städte</Text>
                    </TouchableOpacity>
                    {userCity && (
                        <TouchableOpacity 
                            onPress={() => setActiveFilter(userCity)} 
                            style={[styles.miniChip, activeFilter === userCity && styles.miniChipActive]}
                        >
                            <Text style={[styles.miniChipText, activeFilter === userCity && styles.miniChipTextActive]}>Nur {CITIES[userCity]}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.filterLabel, {marginTop: 12}]}>Kategorie:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    <TouchableOpacity 
                        style={[styles.catChip, selectedCategory === "all" && styles.catChipActive]}
                        onPress={() => setSelectedCategory("all")}
                    >
                        <Text style={[styles.catChipText, selectedCategory === "all" && styles.catChipTextActive]}>Alle</Text>
                    </TouchableOpacity>
                    {categoriesList.map(cat => (
                        <TouchableOpacity 
                            key={cat.id}
                            style={[styles.catChip, selectedCategory === cat.id && styles.catChipActive]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[styles.catChipText, selectedCategory === cat.id && styles.catChipTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )}
      </View>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        renderItem={({ item }) => {
            const dateStr = item.startDate?.seconds 
                ? new Date(item.startDate.seconds * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) 
                : "Bald";

            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate('EventDetail', { event: item })}>
                <View style={styles.imagePlaceholder}>
                    {item.image ? (
                        <Image 
                            source={item.image} 
                            style={styles.image} 
                            contentFit="cover"
                            transition={300}
                            cachePolicy="memory-disk"
                        />
                    ) : (
                        <View style={styles.emptyImage}>
                          <Ionicons name="calendar-outline" size={40} color="#475569" />
                        </View>
                    )}
                    <View style={styles.badge}><Text style={styles.badgeText}>{categories[item.category] || "Event"}</Text></View>
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.date}>{dateStr}</Text>
                        <Text style={[styles.price, item.isFree && styles.freePrice]}>{item.isFree ? "Gratis" : item.price}</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-sharp" size={14} color="#64748b" /><Text style={styles.info}>{item.city} • {item.location}</Text>
                    </View>
                </View>
              </TouchableOpacity>
            );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingHorizontal: 16 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  headerContainer: { marginTop: 60, marginBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  locationBadgeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  locationBadgeText: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  locationActiveText: { color: '#6366f1' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  iconBtnActive: { backgroundColor: '#6366f1', borderColor: '#818cf8' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, borderRadius: 12, height: 45, borderWidth: 1, borderColor: '#334155' },
  searchInput: { flex: 1, color: 'white', marginLeft: 8, fontSize: 15 },
  expandableFilters: { marginTop: 15, padding: 15, backgroundColor: '#1e293b', borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  filterLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 8 },
  miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  miniChipActive: { backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1' },
  miniChipText: { color: '#64748b', fontSize: 12 },
  miniChipTextActive: { color: 'white', fontWeight: 'bold' },
  catScroll: { marginTop: 5 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#0f172a', marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  catChipActive: { backgroundColor: '#6366f1', borderColor: '#818cf8' },
  catChipText: { color: '#64748b', fontSize: 12 },
  catChipTextActive: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', borderRadius: 20, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  imagePlaceholder: { height: 160, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: '100%' },
  emptyImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(15, 23, 42, 0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  cardContent: { padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { color: '#6366f1', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  info: { color: '#94a3b8', fontSize: 13 },
  price: { color: '#cbd5e1', fontWeight: 'bold', fontSize: 14 },
  freePrice: { color: '#4ade80' }
});