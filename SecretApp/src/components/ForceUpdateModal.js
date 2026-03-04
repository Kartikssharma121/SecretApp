import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    BackHandler,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Update this to your Play Store / App Store link
const UPDATE_URL = 'https://play.google.com/store/apps';

const ForceUpdateModal = ({ visible }) => {
    // Prevent Android hardware back button from dismissing the modal
    React.useEffect(() => {
        if (!visible) return;
        const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => handler.remove();
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => { }} // No-op — cannot be dismissed
            statusBarTranslucent>
            <View style={styles.overlay}>
                <LinearGradient colors={['#2e1f42', '#1a1028']} style={styles.card}>
                    {/* Accent bar */}
                    <View style={styles.accentBar} />

                    <Text style={styles.emoji}>🚀</Text>

                    <Text style={styles.title}>Update Required</Text>

                    <Text style={styles.message}>
                        A new version of Secret Call is available. Please update the app to continue using it.
                    </Text>

                    <TouchableOpacity
                        style={styles.updateButton}
                        activeOpacity={0.85}
                        onPress={() => Linking.openURL(UPDATE_URL)}>
                        <Text style={styles.updateButtonText}>Update Now</Text>
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        You must update to continue using the app.
                    </Text>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    card: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 28,
        alignItems: 'center',
    },
    accentBar: {
        height: 3,
        width: 40,
        borderRadius: 2,
        backgroundColor: 'rgba(200, 100, 220, 0.7)',
        marginBottom: 22,
    },
    emoji: {
        fontSize: 52,
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    message: {
        fontSize: 15,
        color: '#a0a0b8',
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 28,
    },
    updateButton: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 48,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    updateButtonText: {
        color: '#1a1028',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    footerNote: {
        fontSize: 12,
        color: '#6a6a8a',
        textAlign: 'center',
    },
});

export default ForceUpdateModal;
