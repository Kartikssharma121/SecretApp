import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const termsData = [
    {
        title: '1. Acceptance of Terms',
        content: 'By downloading, installing, or using the SecretCall mobile application, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, you must not use or install the application.'
    },
    {
        title: '2. Eligibility',
        content: 'You must be at least 18 years of age (or the age of majority in your jurisdiction) to register for and use SecretCall. By using the app, you warrant that you meet this age requirement. If you are under 18, you are strictly prohibited from using the platform.'
    },
    {
        title: '3. User Responsibilities & Content (UGC)',
        content: 'SecretCall is an anonymous messaging and WebRTC voice call app connecting strangers. Because these sessions are real-time, peer-to-peer, and not monitored, you are solely responsible for your behavior and any content you transmit.\n\nYou agree NOT to share, show, speak, or transmit content that is illegal, harmful, threatening, abusive, harassing, explicit, pornographic, promoting violence, hate speech, or scamming.'
    },
    {
        title: '4. Zero-Tolerance Abuse Policy',
        content: 'We enforce a strict zero-tolerance policy for harassment, abuse, or inappropriate behavior. Users can instantly disconnect from or block any matched partner. If a user is reported or identified as violating these terms, their account will be permanently suspended or banned.'
    },
    {
        title: '5. Disclaimer of Warranties',
        content: 'SecretCall is provided "AS IS" and "AS AVAILABLE" without any warranties of any kind, express or implied. We do not guarantee that the service will be uninterrupted, error-free, secure, or free of offensive user behavior. You use the service and interact with strangers entirely at your own risk.'
    },
    {
        title: '6. Absolute Limitation of Liability',
        content: 'To the maximum extent permitted by law, the developers, authors, administrators, and hosts of SecretCall shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages. This includes, but is not limited to, emotional distress, data loss, or harms resulting from your interactions, chats, or calls with strangers.'
    },
    {
        title: '7. Governing Law',
        content: 'These terms shall be governed by and construed in accordance with the laws applicable in your jurisdiction. Any legal dispute or claim arising from your use of the application is waived, and the developers shall be held entirely harmless.'
    }
];

const privacyData = [
    {
        title: '1. Introduction',
        content: 'Welcome to SecretCall. We operate an anonymous communication platform designed to enable users to match, text chat, and voice call with strangers without exposing their personal identities. Your privacy is important to us. This Privacy Policy describes how we handle user data.'
    },
    {
        title: '2. Information We Collect',
        content: 'To keep the platform safe and functional, we collect only the minimum necessary information:\n\n• Account Credentials: Name, email address, password (encrypted), and gender.\n• Network Status: Whether you are online and your last active timestamp to manage matching.\n• Technical Logs: App version, error traces, and connection logs to debug issues.'
    },
    {
        title: '3. Zero Communication Retention Policy',
        content: 'Your conversations and calls are strictly private and anonymous:\n\n• Voice Calls: All voice calls are established peer-to-peer using WebRTC. Audio streams flow directly between you and the matched stranger. We do not record or store your audio.\n• Text Chats: Real-time text messages are delivered immediately and are automatically destroyed or cleared after matching sessions.'
    },
    {
        title: '4. Third-Party Services',
        content: 'We use standard infrastructure providers to host our application, including Render (hosting backend services) and MongoDB (storing hashed authentication records and matching states).'
    },
    {
        title: '5. User Generated Content & Reporting',
        content: 'Users can block or report strangers if they engage in abusive, explicit, or objectionable behavior. Accounts violating terms will be permanently blacklisted. You interact with strangers entirely at your own risk.'
    },
    {
        title: '6. Liability Waiver & Legal Compliance',
        content: 'SecretCall is provided on an "AS IS" basis. We disclaim all liability of any kind for user activities. Under no circumstances shall the developers, authors, or hosting services be held liable for any damages or harms arising from your use of the application.'
    }
];

const LegalScreen = ({ route, navigation }) => {
    const { type } = route.params || { type: 'terms' };
    const isTerms = type === 'terms';
    const data = isTerms ? termsData : privacyData;
    const title = isTerms ? 'Terms & Conditions' : 'Privacy Policy';

    return (
        <LinearGradient
            colors={['#241b2f', '#120f17']}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <View style={styles.headerRightPlaceholder} />
                </View>

                {/* Content */}
                <ScrollView 
                    style={styles.contentScroll}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.effectiveDate}>
                        Effective Date: June 24, 2026
                    </Text>

                    {data.map((item, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardContent}>{item.content}</Text>
                        </View>
                    ))}

                    <View style={styles.footerSpacing} />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    backButton: {
        padding: 8,
    },
    backArrow: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    headerRightPlaceholder: {
        width: 40,
    },
    contentScroll: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    effectiveDate: {
        color: '#a0a0b8',
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardTitle: {
        color: '#a78bfa',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    cardContent: {
        color: '#e4e4e7',
        fontSize: 14,
        lineHeight: 22,
    },
    footerSpacing: {
        height: 40,
    },
});

export default LegalScreen;
