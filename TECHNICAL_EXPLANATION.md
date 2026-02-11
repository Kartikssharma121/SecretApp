# Secret Call - Step-by-Step Technical Explanation

## Overview

This document provides a deep dive into how the anonymous communication platform works, explaining the flow from user registration to making calls and sending messages.

---

## 1. Authentication Flow

### Registration Process

1. **User fills registration form** (`RegisterScreen.js`)
   - Name, email, password, gender selection
   - Frontend validation (min 6 chars password)

2. **Frontend sends POST request** to `/api/auth/register`
   ```javascript
   const data = await authService.register({ name, email, password, gender });
   ```

3. **Backend receives request** (`authController.js`)
   - Validates all fields are present
   - Checks if user already exists
   - Validates gender is Male or Female

4. **User model creates new user** (`User.js`)
   - Password is automatically hashed via pre-save hook:
   ```javascript
   userSchema.pre('save', async function (next) {
     const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt);
   });
   ```

5. **JWT token generated** (`generateToken.js`)
   ```javascript
   jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '24h' });
   ```

6. **Response sent to frontend** with user data + token

7. **Frontend stores token** in AsyncStorage
   ```javascript
   await AsyncStorage.setItem('token', data.token);
   ```

8. **Redux state updated** with user info
   ```javascript
   dispatch(setCredentials({ user: data, token: data.token }));
   ```

9. **Navigation to Home screen**

### Login Process

Similar to registration, but:
- User enters email + password
- Backend finds user with `User.findOne({ email })`
- Password compared using bcrypt:
  ```javascript
  user.matchPassword(password) // Returns true/false
  ```
- Updates user status to online
- Returns token

---

## 2. Socket.IO Connection

### Initialization

1. **User logs in successfully** → navigates to Home screen

2. **useSocket hook initializes** (`useSocket.js`)
   - Creates Socket.IO connection:
   ```javascript
   socketRef.current = io(SOCKET_URL, {
     auth: { token }, // JWT token for authentication
     transports: ['websocket'],
   });
   ```

3. **Backend receives connection** (`socketHandler.js`)
   - Socket authentication middleware runs:
   ```javascript
   const socketAuth = async (socket, next) => {
     const token = socket.handshake.auth.token;
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     const user = await User.findById(decoded.id);
     socket.userId = user._id.toString();
     next();
   }
   ```

4. **User authenticated** → 'connect' event fires
   - User ID stored in `userSockets` Map (userId → socketId)
   - Socket ID stored in `socketUsers` Map (socketId → userId)
   - User status updated to online in MongoDB

5. **Frontend receives 'connect' event**
   ```javascript
   socket.on('connect', () => {
     dispatch(setConnected(true));
   });
   ```

---

## 3. Matching System Flow

### User Initiates Call/Chat

1. **User clicks "Secret Voice Call"** in Home screen
   - Filter modal opens

2. **User selects preferences**
   - Gender: Male, Female, or Any
   - Clicks "Start"

3. **Navigation to VoiceCallScreen** with params:
   ```javascript
   navigation.navigate('VoiceCall', { 
     preferences: { gender: 'Female' }, 
     type: 'call' 
   });
   ```

4. **VoiceCallScreen mounts** → calls `joinQueue`:
   ```javascript
   socket.joinQueue('call', { gender: 'Female' });
   ```

### Backend Matching Process

5. **Backend receives 'joinQueue' event** (`socketHandler.js`)

6. **Matching service adds user to queue** (`matchingService.js`):
   ```javascript
   // Create session in MongoDB
   const session = await ActiveSession.create({
     userId,
     socketId,
     type: 'call',
     preferences: { gender: 'Female' },
     status: 'waiting',
   });
   
   // Add to in-memory queue for fast matching
   this.waitingQueues['call'].push({
     sessionId: session._id,
     userId,
     socketId,
     preferences,
   });
   ```

7. **Immediately try to find match**:
   ```javascript
   const match = await matchingService.findMatch(userId, 'call', preferences);
   ```

8. **Matching algorithm checks each user in queue**:
   ```javascript
   for (let i = 0; i < queue.length; i++) {
     const potential = queue[i];
     
     // Skip self
     if (potential.userId === userId) continue;
     
     // Get potential partner
     const potentialUser = await User.findById(potential.userId);
     
     // Check if preferences match
     const currentUserWants = preferences.gender; // 'Female'
     const potentialUserIs = potentialUser.gender; // 'Female'
     const potentialUserWants = potential.preferences.gender; // 'Male'
     const currentUserIs = user.gender; // 'Male'
     
     // Current user wants Female AND potential is Female
     const currentMatch = currentUserWants === 'Any' || 
                          potentialUserIs === currentUserWants;
     
     // Potential wants Male AND current is Male
     const potentialMatch = potentialUserWants === 'Any' || 
                            currentUserIs === potentialUserWants;
     
     if (currentMatch && potentialMatch) {
       // MATCH FOUND!
       queue.splice(i, 1); // Remove from queue
       return { partnerId, partnerSocketId, sessionId };
     }
   }
   ```

9. **If match found**:
   - Create `Match` record in MongoDB
   - Update both sessions to 'matched' status
   - Store in `activeMatches` Map
   - Emit 'matchFound' to both users:
   ```javascript
   socket.emit('matchFound', {
     matchId: matchRecord._id,
     partnerId: match.partnerId,
     type: 'call',
   });
   
   partnerSocket.emit('matchFound', {
     matchId: matchRecord._id,
     partnerId: userId,
     type: 'call',
   });
   ```

10. **If no match**:
    - User stays in queue
    - Emit 'queueStatus' with status='waiting'
    - Wait for another user to join

---

## 4. WebRTC Voice Call Flow

### Call Initiation

1. **Both users receive 'matchFound' event**

2. **Frontend updates state**:
   ```javascript
   setPartnerId(matchData.partnerId);
   setMatchId(matchData.matchId);
   setIsSearching(false);
   ```

3. **User who joined first creates offer** (determined by timing):
   ```javascript
   createOffer().catch(err => console.error(err));
   ```

### WebRTC Connection Establishment

4. **createOffer function** (`useWebRTC.js`):
   ```javascript
   // Initialize peer connection
   peerConnectionRef.current = new RTCPeerConnection({
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' }
     ]
   });
   
   // Get microphone access
   const stream = await mediaDevices.getUserMedia({ audio: true });
   
   // Add audio track to peer connection
   stream.getTracks().forEach(track => {
     peerConnectionRef.current.addTrack(track, stream);
   });
   
   // Create SDP offer
   const offer = await peerConnectionRef.current.createOffer();
   await peerConnectionRef.current.setLocalDescription(offer);
   
   // Send offer via Socket.IO
   socket.sendOffer(offer, partnerId);
   ```

5. **Backend receives 'offer' event**:
   ```javascript
   socket.on('offer', (data) => {
     const { offer, partnerId } = data;
     const partnerSocketId = userSockets.get(partnerId);
     io.to(partnerSocketId).emit('offer', { offer, senderId: userId });
   });
   ```

6. **Partner receives offer** → creates answer:
   ```javascript
   socket.on('offer', (data) => {
     handleOffer(data.offer);
   });
   
   // Handle offer
   await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
   const answer = await peerConnection.createAnswer();
   await peerConnection.setLocalDescription(answer);
   socket.sendAnswer(answer, partnerId);
   ```

7. **Original user receives answer**:
   ```javascript
   socket.on('answer', (data) => {
     handleAnswer(data.answer);
   });
   
   // Handle answer
   await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
   ```

8. **ICE candidates exchanged** (NAT traversal):
   ```javascript
   peerConnection.onicecandidate = (event) => {
     if (event.candidate) {
       socket.sendIceCandidate(event.candidate, partnerId);
     }
   };
   
   socket.on('iceCandidate', (data) => {
     peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
   });
   ```

9. **Connection established** → peer-to-peer audio streaming begins
   - connectionState changes to 'connected'
   - Users can now hear each other

### Call Controls

**Mute/Unmute:**
```javascript
const toggleMute = () => {
  const audioTrack = localStream.getAudioTracks()[0];
  audioTrack.enabled = !audioTrack.enabled;
  setIsMuted(!audioTrack.enabled);
};
```

**End Call:**
```javascript
const endCall = () => {
  // Stop all tracks
  localStream.getTracks().forEach(track => track.stop());
  
  // Close peer connection
  peerConnection.close();
  
  // Notify backend
  socket.disconnectPartner();
};
```

---

## 5. Chat System Flow

### Chat Initiation

1. **User selects "Secret Chat"** → similar matching process

2. **Match found** → both navigate to ChatScreen

3. **Chat interface displayed** with message list

### Sending Messages

4. **User types message** and clicks "Send":
   ```javascript
   const handleSendMessage = () => {
     // Add to local state immediately (optimistic update)
     const newMessage = {
       _id: Date.now().toString(),
       senderId: userId,
       receiverId: partnerId,
       message: messageText,
       timestamp: new Date(),
     };
     dispatch(addMessage(newMessage));
     
     // Send via socket
     socket.sendMessage(messageText, partnerId, matchId);
   };
   ```

5. **Backend receives 'message' event**:
   ```javascript
   socket.on('message', async (data) => {
     const { message, receiverId, matchId } = data;
     
     // Save to MongoDB
     const newMessage = await Message.create({
       matchId,
       senderId: userId,
       receiverId,
       message,
       timestamp: Date.now(),
       seen: false,
     });
     
     // Send to receiver
     const receiverSocketId = userSockets.get(receiverId);
     io.to(receiverSocketId).emit('message', newMessage);
     
     // Confirm to sender
     socket.emit('messageSent', newMessage);
   });
   ```

6. **Receiver gets message**:
   ```javascript
   socket.on('message', (data) => {
     dispatch(addMessage(data));
     // Auto-scroll to bottom
     flatListRef.current?.scrollToEnd();
   });
   ```

### Typing Indicator

7. **User starts typing**:
   ```javascript
   useEffect(() => {
     if (messageText && partnerId) {
       socket.sendTyping(partnerId, true);
       
       // Clear after 1 second of no typing
       const timeout = setTimeout(() => {
         socket.sendTyping(partnerId, false);
       }, 1000);
       
       return () => clearTimeout(timeout);
     }
   }, [messageText]);
   ```

8. **Backend forwards typing event**:
   ```javascript
   socket.on('typing', (data) => {
     const partnerSocketId = userSockets.get(data.partnerId);
     io.to(partnerSocketId).emit('typing', {
       senderId: userId,
       isTyping: data.isTyping,
     });
   });
   ```

9. **Partner sees "Stranger is typing..."**:
   ```javascript
   socket.on('typing', (data) => {
     dispatch(setPartnerTyping(data.isTyping));
   });
   ```

---

## 6. Reconnect Logic

### Disconnect Handling

1. **User clicks "End Call/Chat"** or accidentally disconnects

2. **Frontend calls**:
   ```javascript
   socket.disconnectPartner();
   ```

3. **Backend updates match record**:
   ```javascript
   socket.on('disconnectPartner', async () => {
     const match = await Match.findById(matchId);
     match.endedAt = Date.now();
     match.duration = (match.endedAt - match.startedAt) / 1000;
     match.reconnectAllowedUntil = new Date(Date.now() + 2 * 60 * 1000); // +2 mins
     await match.save();
     
     // Notify partner
     io.to(partnerSocketId).emit('partnerDisconnected', {
       partnerId: userId,
       matchId,
       canReconnect: true,
     });
   });
   ```

4. **Partner receives disconnect notification**:
   ```javascript
   Alert.alert('Disconnected', 'Stranger disconnected', [
     { text: 'End Call', onPress: () => navigation.goBack() },
     { text: 'Find New', onPress: () => joinQueue() },
   ]);
   ```

### Reconnecting

5. **User clicks "Reconnect" button** (if within 2 minutes):
   ```javascript
   socket.reconnectToPartner(matchId);
   ```

6. **Backend validates reconnection**:
   ```javascript
   socket.on('reconnectPartner', async (data) => {
     const match = await Match.findById(matchId);
     
     // Check if allowed
     if (!match.reconnectAllowedUntil || 
         new Date() > match.reconnectAllowedUntil) {
       socket.emit('error', { message: 'Reconnect window expired' });
       return;
     }
     
     // Check partner online
     const partnerSocketId = userSockets.get(partnerId);
     if (!partnerSocketId) {
       socket.emit('error', { message: 'Partner offline' });
       return;
     }
     
     // Reconnect
     match.endedAt = null;
     match.reconnectAllowedUntil = null;
     await match.save();
     
     // Notify both
     socket.emit('reconnected', { matchId, partnerId, type: match.type });
     io.to(partnerSocketId).emit('reconnected', { matchId, partnerId: userId, type });
   });
   ```

7. **Both users reconnected** → resume call/chat

---

## 7. Session Management

### Single Session Enforcement

- `ActiveSession` model ensures one active session per user
- Before joining queue, check for existing session:
  ```javascript
  const existingSession = await ActiveSession.findOne({
    userId,
    status: { $in: ['waiting', 'matched', 'in-call', 'in-chat'] },
  });
  
  if (existingSession) {
    return { success: false, message: 'Already in session' };
  }
  ```

### Cleanup on Disconnect

When user disconnects (closes app, network issue):
```javascript
socket.on('disconnect', async () => {
  // Update user status
  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: Date.now(),
  });
  
  // End active match
  const matchData = activeMatches.get(userId);
  if (matchData) {
    const match = await Match.findById(matchData.matchId);
    match.endedAt = Date.now();
    match.reconnectAllowedUntil = new Date(Date.now() + 2 * 60 * 1000);
    await match.save();
    
    // Notify partner
    io.to(partnerSocketId).emit('partnerDisconnected', { ... });
  }
  
  // Clean up sessions and queues
  await matchingService.cleanupUserSessions(userId);
  userSockets.delete(userId);
  socketUsers.delete(socket.id);
});
```

---

## 8. Security Measures

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Never stored in plaintext
- Never returned in API responses

### JWT Security
- Tokens signed with secret key
- 24-hour expiration
- Verified on every protected route
- Verified on socket connection

### Socket Security
- Token-based authentication
- User can't impersonate others
- Socket ID mapping prevents message interception

### Data Validation
- Email format validation
- Password minimum length
- Gender enum validation
- MongoDB injection prevention via Mongoose

---

## 9. Data Flow Summary

```
User Registration → Hash Password → Save to MongoDB → Generate JWT → 
Store in AsyncStorage → Update Redux → Navigate to Home

Login → Verify Password → Generate JWT → Update to Online → 
Store Token → Connect Socket.IO

Join Queue → Create Session → Add to Queue → Find Match → 
Create Match Record → Emit to Both Users

Voice Call: Match → Create Offer → Send via Socket → Receive → 
Create Answer → Exchange ICE → P2P Connection → Audio Stream

Chat: Match → Send Message → Save to DB → Emit to Partner → 
Display → Typing Indicators

Disconnect → Update Match → Set Reconnect Window → Notify Partner → 
Allow 2-min Reconnect

Reconnect → Validate Time → Check Partner Online → Update Match → 
Notify Both → Resume Session
```

---

## 10. Scalability Considerations

### Current Implementation
- In-memory queue (fast but loses data on restart)
- Single server (no load balancing)

### Production Recommendations
1. **Use Redis for queues** - persistent, distributed
2. **Multiple servers** - load balancer + sticky sessions
3. **MongoDB replica set** - high availability
4. **TURN servers** - for NAT traversal in production
5. **Rate limiting** - prevent abuse
6. **Error monitoring** - Sentry, DataDog
7. **Analytics** - track user behavior

---

This completes the technical explanation of how the Secret Call platform works end-to-end!
