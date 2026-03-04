import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * CustomAlert – drop-in replacement for Alert.alert()
 *
 * Props:
 *   visible   : boolean
 *   title     : string
 *   message   : string
 *   buttons   : Array<{ text: string, onPress?: () => void, style?: 'default' | 'destructive' | 'cancel' }>
 *   onClose   : () => void  (called when backdrop is tapped)
 */
const CustomAlert = ({ visible, title, message, buttons = [], onClose }) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent>
            <View style={styles.overlay}>
                {/* Backdrop */}
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

                {/* Card */}
                <LinearGradient
                    colors={['#2e1f42', '#1a1028']}
                    style={styles.card}>
                    {/* Thin accent bar */}
                    <View style={styles.accentBar} />

                    {title ? <Text style={styles.title}>{title}</Text> : null}
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    <View style={[styles.buttonRow, buttons.length > 2 && styles.buttonColumn]}>
                        {buttons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        buttons.length === 1 && styles.buttonFull,
                                        buttons.length > 2 && styles.buttonFullRow,
                                        isDestructive && styles.destructiveButton,
                                        isCancel && styles.cancelButton,
                                    ]}
                                    onPress={() => {
                                        btn.onPress?.();
                                    }}
                                    activeOpacity={0.75}>
                                    <Text
                                        style={[
                                            styles.buttonText,
                                            isDestructive && styles.destructiveText,
                                            isCancel && styles.cancelText,
                                        ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        width: '100%',
        borderRadius: 22,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 20,
    },
    accentBar: {
        height: 3,
        width: 40,
        borderRadius: 2,
        backgroundColor: 'rgba(200, 100, 220, 0.7)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    message: {
        fontSize: 15,
        color: '#a0a0b8',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
    },
    buttonColumn: {
        flexDirection: 'column',
        gap: 10,
    },
    button: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    buttonFull: {
        flex: undefined,
        width: '100%',
    },
    buttonFullRow: {
        flex: undefined,
        width: '100%',
    },
    destructiveButton: {
        backgroundColor: 'rgba(210, 50, 80, 0.2)',
        borderColor: 'rgba(210, 50, 80, 0.4)',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.07)',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    destructiveText: {
        color: '#ff6b8a',
    },
    cancelText: {
        color: '#7a7a9a',
    },
});

export default CustomAlert;
