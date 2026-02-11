require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const initializeSocket = require('./src/socket/socketHandler');

const app = express();
app.set("trust proxy", 1); // Helper for Render reverse proxy

const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_URL || "*";

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Connect to MongoDB
// connectDB(); // Removed direct call

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'SecretCall API is running', status: 'success' });
});

// Initialize Socket.IO handlers
initializeSocket(io);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {},
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 Socket.IO server ready`);
        });
    } catch (error) {
        console.error("DB connection failed:", error);
        process.exit(1);
    }
};

startServer();
