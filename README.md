# Secret Call - Anonymous Communication Platform

A production-level React Native CLI application with Node.js backend for anonymous random voice calls and chat with strangers.

## 🎯 Features

### Authentication
- User registration (name, email, password, gender)
- Login with JWT authentication
- Secure token storage with AsyncStorage
- Persistent login sessions

### Voice Calls (WebRTC)
- Real-time peer-to-peer voice calls
- WebRTC signaling via Socket.IO
- ICE candidate exchange
- Mute/unmute microphone
- End call functionality
- Find next stranger

### Secret Chat
- Real-time text messaging
- Typing indicators
- Message timestamps
- Seen status
- Auto-scrolling message list

### Matching System
- Gender-based filtering (Male/Female/Any)
- Queue-based matching
- Real-time match notifications
- Prevents self-matching
- Single active session per user

### Reconnect Logic
- 2-minute reconnect window after disconnect
- Reconnect to last partner
- Disconnect notifications

## 📁 Project Structure

```
Secretcall/
├── backend/                      # Node.js Express Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js            # MongoDB connection
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   └── userController.js
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── ActiveSession.js
│   │   │   ├── Match.js
│   │   │   └── Message.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   └── userRoutes.js
│   │   ├── services/
│   │   │   └── matchingService.js
│   │   ├── socket/
│   │   │   └── socketHandler.js
│   │   └── utils/
│   │       └── generateToken.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── SecretCallApp/               # React Native Frontend
    ├── src/
    │   ├── hooks/
    │   │   ├── useSocket.js
    │   │   └── useWebRTC.js
    │   ├── navigation/
    │   │   └── AppNavigator.js
    │   ├── screens/
    │   │   ├── SplashScreen.js
    │   │   ├── LoginScreen.js
    │   │   ├── RegisterScreen.js
    │   │   ├── HomeScreen.js
    │   │   ├── VoiceCallScreen.js
    │   │   └── ChatScreen.js
    │   ├── services/
    │   │   ├── api.js
    │   │   └── authService.js
    │   ├── store/
    │   │   ├── authSlice.js
    │   │   ├── socketSlice.js
    │   │   └── store.js
    │   └── utils/
    │       └── config.js
    ├── App.js
    ├── index.js
    └── package.json
```

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React Native CLI** - Mobile framework
- **Redux Toolkit** - State management
- **React Navigation** - Navigation
- **Socket.IO Client** - Real-time client
- **react-native-webrtc** - WebRTC support
- **AsyncStorage** - Persistent storage
- **Axios** - HTTP client

## 📋 Prerequisites

- Node.js v16 or higher
- MongoDB installed and running
- React Native development environment set up
- Android Studio (for Android) or Xcode (for iOS)

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd Desktop/Secretcall
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file (already created)
# Update MONGODB_URI if needed

# Start MongoDB (if not running)
# MacOS:
brew services start mongodb-community

# Start the server
npm run dev
```

The backend will run on **http://localhost:3000**

### 3. Frontend Setup

```bash
cd ../SecretCallApp

# Install dependencies
npm install

# For iOS (Mac only)
cd ios && pod install && cd ..

# Update API URLs in src/utils/config.js
# For Android emulator: http://10.0.2.2:3000
# For physical device: http://YOUR_IP:3000
```

### 4. Run the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## 🔑 Environment Variables

### Backend (.env)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/secretcall
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRE=24h
NODE_ENV=development
```

### Frontend (src/utils/config.js)

For **Android Emulator**:
```javascript
export const API_URL = 'http://10.0.2.2:3000';
export const SOCKET_URL = 'http://10.0.2.2:3000';
```

For **iOS Simulator**:
```javascript
export const API_URL = 'http://localhost:3000';
export const SOCKET_URL = 'http://localhost:3000';
```

For **Physical Device**:
```javascript
export const API_URL = 'http://192.168.X.X:3000'; // Your computer's IP
export const SOCKET_URL = 'http://192.168.X.X:3000';
```

## 📡 API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "gender": "Male"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### User

#### Get Profile
```http
GET /api/user/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated"
}
```

## 🔌 Socket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `joinQueue` | `{ type, preferences }` | Join matching queue |
| `leaveQueue` | `{ type }` | Leave queue |
| `offer` | `{ offer, partnerId }` | Send WebRTC offer |
| `answer` | `{ answer, partnerId }` | Send WebRTC answer |
| `iceCandidate` | `{ candidate, partnerId }` | Send ICE candidate |
| `message` | `{ message, receiverId, matchId }` | Send chat message |
| `typing` | `{ partnerId, isTyping }` | Typing indicator |
| `disconnectPartner` | `{}` | Disconnect from partner |
| `reconnectPartner` | `{ matchId }` | Reconnect to partner |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `matchFound` | `{ matchId, partnerId, type }` | Match found |
| `queueStatus` | `{ status, type }` | Queue status update |
| `offer` | `{ offer, senderId }` | Receive WebRTC offer |
| `answer` | `{ answer, senderId }` | Receive WebRTC answer |
| `iceCandidate` | `{ candidate, senderId }` | Receive ICE candidate |
| `message` | `{ message, senderId, ... }` | Receive message |
| `messageSent` | `{ ... }` | Message sent confirmation |
| `typing` | `{ senderId, isTyping }` | Partner typing |
| `partnerDisconnected` | `{ partnerId, canReconnect }` | Partner left |
| `reconnected` | `{ matchId, partnerId, type }` | Reconnected |
| `error` | `{ message }` | Error occurred |

## 💡 How It Works

### Matching Algorithm

1. User selects preferences (gender filter)
2. User clicks "Secret Call" or "Secret Chat"
3. User joins queue with preferences
4. Backend searches for compatible match:
   - Same session type (call/chat)
   - Compatible gender preferences
   - Currently waiting in queue
   - Not blocked
5. First compatible match is connected
6. Both users receive `matchFound` event
7. For voice calls: WebRTC connection established
8. For chat: Real-time messaging begins

### WebRTC Flow (Voice Calls)

1. Match found → both users notified
2. User A creates offer → sends to User B
3. User B receives offer → creates answer → sends back
4. Both exchange ICE candidates
5. Peer-to-peer connection established
6. Audio stream begins

### Reconnect Logic

1. When call/chat ends, match data saved
2. `reconnectAllowedUntil` = current time + 2 minutes
3. User can press "Reconnect" button
4. Backend checks:
   - Within 2-minute window?
   - Partner online?
   - No blocks?
5. If valid → both reconnected
6. Else → error message

## 🔒 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT authentication with 24h expiration
- Socket authentication using token
- Input validation on all endpoints
- Single active session per user
- Prevents self-matching
- MongoDB injection protection

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
brew services list

# Start MongoDB
brew services start mongodb-community
```

### Android Cannot Connect to Backend
- Update API URLs to `http://10.0.2.2:3000`
- Ensure backend is running
- Check firewall settings

### iOS Build Errors
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### WebRTC Permission Errors
- Ensure microphone permissions are granted
- Check iOS Info.plist has `NSMicrophoneUsageDescription`
- Check Android AndroidManifest.xml has `RECORD_AUDIO` permission

## 📱 Testing

### Test with Two Devices

1. Start backend: `cd backend && npm run dev`
2. Run app on Device 1 (Android emulator)
3. Run app on Device 2 (Physical device or iOS simulator)
4. Register two different accounts
5. Login on both devices
6. One user selects "Secret Call", other selects "Secret Call"
7. Both should match and connect

## 🎨 Customization

### Change Colors
Edit styles in each screen file to match your brand colors.

### Add More Filters
1. Update `ActiveSession` model to include new preferences
2. Modify `matchingService.js` to filter by new criteria
3. Update `FilterModal` in `HomeScreen.js`

### Add Voice Call Recording
Integrate audio recording in `useWebRTC.js` hook

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 👨‍💻 Author

Built as a production-level demonstration of:
- React Native CLI
- WebRTC peer-to-peer communication
- Socket.IO real-time features
- Redux Toolkit state management
- MongoDB with Mongoose
- JWT authentication

---

**Note**: This is a production-ready codebase. Remember to:
- Change JWT_SECRET in production
- Set up proper MongoDB Atlas for production
- Add rate limiting
- Implement proper error logging (e.g., Sentry)
- Add analytics
- Implement proper STUN/TURN servers for WebRTC in production
