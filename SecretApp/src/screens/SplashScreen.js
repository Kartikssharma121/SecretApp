import React from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const SplashScreen = () => {
    return (
        <LinearGradient
            colors={['#09050dff', '#000000ff']}
            style={styles.container}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <View style={styles.logoContainer}>
                <Image
                    source={require('../../assets/logo.jpg')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.title}>IGNYT</Text>
                <Text style={styles.subtitle}>Anonymous Communication</Text>
                <ActivityIndicator color="#fff" size="large" style={styles.loader} />
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    logoImage: {
        width: 150,
        height: 150,
        marginBottom: 20,
        backgroundColor: 'transparent',
        borderRadius: 60

    },
    textContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#a0a0b8',
        marginBottom: 40,
    },
    loader: {
        marginTop: 20,
    },
});

export default SplashScreen;
