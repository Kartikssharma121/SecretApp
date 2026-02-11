import { useEffect, useRef, useState, useCallback } from 'react';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export const useWebRTC = (socket, partnerId) => {
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    // Initialize peer connection
    const initializePeerConnection = useCallback(() => {
        if (!peerConnectionRef.current) {
            peerConnectionRef.current = new RTCPeerConnection(configuration);

            // Handle ICE candidates
            peerConnectionRef.current.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.sendIceCandidate(event.candidate, partnerId);
                }
            };

            // Handle connection state change
            peerConnectionRef.current.onconnectionstatechange = () => {
                const state = peerConnectionRef.current?.connectionState;
                console.log('Connection state:', state);
                setIsConnected(state === 'connected');
            };

            // Handle ICE connection state change
            peerConnectionRef.current.oniceconnectionstatechange = () => {
                const state = peerConnectionRef.current?.iceConnectionState;
                console.log('ICE connection state:', state);
            };
        }
    }, [socket, partnerId]);

    // Get local audio stream
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await mediaDevices.getUserMedia({
                audio: true,
                video: false,
            });
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Error getting local stream:', error);
            throw error;
        }
    }, []);

    // Create and send offer
    const createOffer = useCallback(async () => {
        try {
            initializePeerConnection();
            const stream = await getLocalStream();

            // Add local stream to peer connection
            stream.getTracks().forEach((track) => {
                peerConnectionRef.current?.addTrack(track, stream);
            });

            // Create offer
            const offer = await peerConnectionRef.current?.createOffer();
            await peerConnectionRef.current?.setLocalDescription(offer);

            // Send offer to partner
            if (socket) {
                socket.sendOffer(offer, partnerId);
            }

            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    }, [initializePeerConnection, getLocalStream, socket, partnerId]);

    // Handle received offer
    const handleOffer = useCallback(async (offer) => {
        try {
            initializePeerConnection();
            const stream = await getLocalStream();

            // Add local stream to peer connection
            stream.getTracks().forEach((track) => {
                peerConnectionRef.current?.addTrack(track, stream);
            });

            // Set remote description
            await peerConnectionRef.current?.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            // Create answer
            const answer = await peerConnectionRef.current?.createAnswer();
            await peerConnectionRef.current?.setLocalDescription(answer);

            // Send answer to partner
            if (socket) {
                socket.sendAnswer(answer, partnerId);
            }

            return answer;
        } catch (error) {
            console.error('Error handling offer:', error);
            throw error;
        }
    }, [initializePeerConnection, getLocalStream, socket, partnerId]);

    // Handle received answer
    const handleAnswer = useCallback(async (answer) => {
        try {
            await peerConnectionRef.current?.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        } catch (error) {
            console.error('Error handling answer:', error);
            throw error;
        }
    }, []);

    // Handle received ICE candidate
    const handleIceCandidate = useCallback(async (candidate) => {
        try {
            await peerConnectionRef.current?.addIceCandidate(
                new RTCIceCandidate(candidate)
            );
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }, []);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // End call
    const endCall = useCallback(() => {
        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        // Close peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        setIsConnected(false);
        setIsMuted(false);
    }, []);

    // Setup socket listeners
    useEffect(() => {
        if (!socket) return;

        socket.onOffer((data) => {
            handleOffer(data.offer);
        });

        socket.onAnswer((data) => {
            handleAnswer(data.answer);
        });

        socket.onIceCandidate((data) => {
            handleIceCandidate(data.candidate);
        });

        return () => {
            endCall();
        };
    }, [socket, handleOffer, handleAnswer, handleIceCandidate, endCall]);

    return {
        createOffer,
        handleOffer,
        handleAnswer,
        handleIceCandidate,
        toggleMute,
        endCall,
        isMuted,
        isConnected,
    };
};

export default useWebRTC;
