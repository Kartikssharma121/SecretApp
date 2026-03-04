import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Secure & Anonymous\nCommunication',
        subtitle: 'Connect with anyone safely without\nrevealing your true identity.',
        emoji: '🔒',
    },
    {
        id: '2',
        title: 'High Quality\nVoice Calls',
        subtitle: 'Experience crystal clear voice quality\nwith end-to-end encryption.',
        emoji: '🎙️',
    },
    {
        id: '3',
        title: 'Private Chat\nRooms',
        subtitle: 'Chat securely with individuals\nor create private group conversations.',
        emoji: '💬',
    },
];

const OnboardingScreen = ({ navigation }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const handleComplete = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace('Login');
        } catch (error) {
            console.error('Error saving onboarding state:', error);
            navigation.replace('Login');
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(currentSlideIndex - 1);
        }
    };

    const nextSlide = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        } else {
            handleComplete();
        }
    };

    const currentSlide = SLIDES[currentSlideIndex];

    return (
        <LinearGradient
            colors={['#241b2f', '#120f17']}
            style={styles.gradientContainer}
        >
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

                {/* Header */}
                <View style={styles.header}>
                    {currentSlideIndex > 0 ? (
                        <TouchableOpacity onPress={prevSlide}>
                            <Text style={styles.headerText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.headerPlaceholder} />
                    )}
                    <TouchableOpacity onPress={handleComplete}>
                        <Text style={styles.headerText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                {/* Illustration Placeholder */}
                <View style={styles.imageContainer}>
                    <Text style={styles.emoji}>{currentSlide.emoji}</Text>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>{currentSlide.title}</Text>
                    <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>

                    {/* Footer with Next Button */}
                    <View style={styles.footer}>
                        {/* Dot Indicators */}
                        <View style={styles.paginationContainer}>
                            {SLIDES.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        currentSlideIndex === index && styles.activeDot,
                                    ]}
                                />
                            ))}
                        </View>

                        <TouchableOpacity style={styles.nextButton} onPress={nextSlide}>
                            <Text style={styles.nextButtonText}>→</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    headerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    headerPlaceholder: {
        width: 40,
    },
    imageContainer: {
        flex: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 120,
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 30,
    },
    title: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 36,
        minHeight: 80, // Prevent jumping layout
    },
    subtitle: {
        color: '#999',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
        minHeight: 50, // Prevent jumping layout
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 40,
    },
    paginationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4a4a6a', // inactive color
        marginRight: 8,
    },
    activeDot: {
        width: 24, // wider active dot
        backgroundColor: '#fff',
    },
    nextButton: {
        backgroundColor: '#fff',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nextButtonText: {
        color: '#1a1a2e',
        fontSize: 28,
        fontWeight: 'bold',
        paddingBottom: 2,
    },
});

export default OnboardingScreen;
