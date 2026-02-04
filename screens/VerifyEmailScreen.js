import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen({ route, navigation }) {
  // Wir holen uns die E-Mail, die vom Register-Screen übergeben wurde
  const { email } = route.params || { email: "deine E-Mail" };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        
        {/* Icon */}
        <View style={styles.iconContainer}>
            <Ionicons name="mail" size={40} color="#818cf8" />
            <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            </View>
        </View>

        <Text style={styles.title}>Fast geschafft!</Text>
        <Text style={styles.text}>
            Wir haben eine Bestätigungs-Mail an
        </Text>
        <View style={styles.emailBox}>
            <Text style={styles.emailText}>{email}</Text>
        </View>
        <Text style={styles.text}>gesendet.</Text>

        {/* Info Box */}
        <View style={styles.infoBox}>
            <View style={{flexDirection: 'row', gap: 10}}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                <View style={{flex: 1}}>
                    <Text style={styles.infoTitle}>Bitte klicke auf den Link in der Mail.</Text>
                    <Text style={styles.infoText}>Erst danach ist dein Login freigeschaltet.</Text>
                </View>
            </View>
            
            <View style={styles.spamHint}>
                <Text style={{fontSize: 16}}>💡</Text>
                <Text style={styles.spamText}>Keine Mail da? Schau unbedingt im <Text style={{fontWeight: 'bold'}}>Spam- / Junk-Ordner</Text> nach!</Text>
            </View>
        </View>

        {/* Button */}
        <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate("Login")}
        >
            <Text style={styles.buttonText}>Zum Login</Text>
            <Ionicons name="arrow-forward" size={18} color="white" style={{marginLeft: 8}}/>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  
  iconContainer: { width: 80, height: 80, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  checkBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#1e293b', borderRadius: 12 },
  
  title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
  text: { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  
  emailBox: { backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  emailText: { color: 'white', fontWeight: 'medium' },

  infoBox: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 12, width: '100%', marginTop: 16, marginBottom: 24 },
  infoTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  infoText: { color: 'rgba(245, 158, 11, 0.8)', fontSize: 13 },
  
  spamHint: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(245, 158, 11, 0.2)', alignItems: 'center' },
  spamText: { color: '#f59e0b', fontSize: 12, flex: 1 },

  button: { backgroundColor: '#6366f1', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});