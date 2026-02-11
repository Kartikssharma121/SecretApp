import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';

const SplashScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.logo}>🔒</Text>
            <Text style={styles.title}>Secret Call</Text>
            <Text style={styles.subtitle}>Anonymous Communication</Text>
            <ActivityIndicator color="#e94560" size="large" style={styles.loader} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        fontSize: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
        marginBottom: 40,
    },
    loader: {
        marginTop: 20,
    },
});

export default SplashScreen;
