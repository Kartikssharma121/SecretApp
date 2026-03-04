import { useEffect, useRef, useState, useCallback } from 'react';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
} from 'react-native-webrtc';

/* ------------------ ICE CONFIG ------------------ */
/* ⚠️ NEVER hardcode TURN credentials in frontend */

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_PASSWORD,
        },
    ].filter(server => server.urls), // remove undefined
    iceTransportPolicy: 'all',
};

export const useWebRTC = (socket, partnerId, isPolite) => {
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const partnerRef = useRef(null);
    const iceQueueRef = useRef([]);

    const makingOfferRef = useRef(false);
    const ignoreOfferRef = useRef(false);
    const politeRef = useRef(isPolite);
    const restartingIceRef = useRef(false);

    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    /* ------------------ Sync Refs ------------------ */

    useEffect(() => {
        partnerRef.current = partnerId;
    }, [partnerId]);

    useEffect(() => {
        politeRef.current = isPolite;
    }, [isPolite]);

    /* ------------------ Peer Init ------------------ */

    const initializePeerConnection = useCallback(() => {
        if (peerConnectionRef.current) return;

        const pc = new RTCPeerConnection(configuration);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && partnerRef.current) {
                socket.sendIceCandidate(event.candidate, partnerRef.current);
            }
        };

        pc.onconnectionstatechange = async () => {
            console.log('Connection State:', pc.connectionState);

            switch (pc.connectionState) {
                case 'connected':
                    setIsConnected(true);
                    restartingIceRef.current = false;
                    break;

                case 'failed':
                    if (!restartingIceRef.current) {
                        restartingIceRef.current = true;
                        try {
                            console.log('Restarting ICE...');
                            await pc.restartIce();
                        } catch (err) {
                            console.log('ICE restart failed:', err);
                        }
                    }
                    break;

                case 'disconnected':
                case 'closed':
                    setIsConnected(false);
                    break;
            }
        };

        pc.ontrack = (event) => {
            console.log('Remote track received');
        };

        peerConnectionRef.current = pc;
    }, [socket]);

    /* ------------------ Local Media ------------------ */

    const getLocalStream = useCallback(async () => {
        if (localStreamRef.current) return localStreamRef.current;

        const stream = await mediaDevices.getUserMedia({
            audio: true,
            video: false,
        });

        localStreamRef.current = stream;
        return stream;
    }, []);

    const addLocalTracks = useCallback(async () => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        const stream = await getLocalStream();

        if (pc.getSenders().length === 0) {
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
        }
    }, [getLocalStream]);

    /* ------------------ Create Offer ------------------ */

    const createOffer = useCallback(async () => {
        if (!partnerRef.current) return;

        initializePeerConnection();
        await addLocalTracks();

        const pc = peerConnectionRef.current;

        try {
            makingOfferRef.current = true;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.sendOffer(pc.localDescription, partnerRef.current);
        } catch (err) {
            console.log('Offer error:', err);
        } finally {
            makingOfferRef.current = false;
        }
    }, [initializePeerConnection, addLocalTracks, socket]);

    /* ------------------ Handle Offer ------------------ */

    const handleOffer = useCallback(
        async (offer) => {
            initializePeerConnection();
            await addLocalTracks();

            const pc = peerConnectionRef.current;

            const offerCollision =
                makingOfferRef.current || pc.signalingState !== 'stable';

            ignoreOfferRef.current =
                !politeRef.current && offerCollision;

            if (ignoreOfferRef.current) {
                console.log('Ignoring offer (glare)');
                return;
            }

            try {
                if (offerCollision && politeRef.current) {
                    await pc.setLocalDescription({ type: 'rollback' });
                }

                await pc.setRemoteDescription(
                    new RTCSessionDescription(offer)
                );

                // Flush ICE queue
                while (iceQueueRef.current.length) {
                    await pc.addIceCandidate(iceQueueRef.current.shift());
                }

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.sendAnswer(pc.localDescription, partnerRef.current);
            } catch (err) {
                console.log('Offer handling error:', err);
            }
        },
        [initializePeerConnection, addLocalTracks, socket]
    );

    /* ------------------ Handle Answer ------------------ */

    const handleAnswer = useCallback(async (answer) => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );

                while (iceQueueRef.current.length) {
                    await pc.addIceCandidate(iceQueueRef.current.shift());
                }
            }
        } catch (err) {
            console.log('Answer error:', err);
        }
    }, []);

    /* ------------------ ICE Handling ------------------ */

    const handleIceCandidate = useCallback(async (candidate) => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        const ice = new RTCIceCandidate(candidate);

        try {
            if (pc.remoteDescription) {
                await pc.addIceCandidate(ice);
            } else {
                iceQueueRef.current.push(ice);
            }
        } catch (err) {
            console.log('ICE error:', err);
        }
    }, []);

    /* ------------------ Controls ------------------ */

    const toggleMute = useCallback(() => {
        if (!localStreamRef.current) return;

        const audioTrack =
            localStreamRef.current.getAudioTracks()[0];

        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
        }
    }, []);

    const endCall = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        iceQueueRef.current = [];
        setIsConnected(false);
        setIsMuted(false);
    }, []);

    /* ------------------ Socket Listeners ------------------ */

    useEffect(() => {
        if (!socket) return;

        const offerHandler = data => handleOffer(data.offer);
        const answerHandler = data => handleAnswer(data.answer);
        const iceHandler = data =>
            handleIceCandidate(data.candidate);

        socket.onOffer(offerHandler);
        socket.onAnswer(answerHandler);
        socket.onIceCandidate(iceHandler);

        return () => {
            socket.offOffer?.(offerHandler);
            socket.offAnswer?.(answerHandler);
            socket.offIceCandidate?.(iceHandler);
            endCall();
        };
    }, [socket, handleOffer, handleAnswer, handleIceCandidate, endCall]);

    return {
        createOffer,
        toggleMute,
        endCall,
        isMuted,
        isConnected,
    };
};

export default useWebRTC;