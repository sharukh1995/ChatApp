const express = require("express");
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server and bind Socket.io to it
const server = http.createServer(app);
const io = socketIo(server);

// Middleware for serving static files and parsing request bodies
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Connection string to MongoDB
const dbUrl = 'mongodb+srv://sharukhahmed207:Sharukh%401995@cluster0.uamh4.mongodb.net/Chatapp?retryWrites=true&w=majority&appName=Cluster0';

// Define Message model
const Message = mongoose.model('Message', new mongoose.Schema({
    name: { type: String, required: true },
    message: { type: String, required: true },
    recipient: { type: String }, // Optional recipient for private messages
    timestamp: { type: Date, default: Date.now }
}));

// Connect to MongoDB with error handling
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connection successful'))
    .catch((error) => console.error('MongoDB connection error:', error));

// GET endpoint to fetch messages
app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find({});
        res.json(messages);
    } catch (err) {
        console.error('Error retrieving messages:', err);
        res.sendStatus(500);
    }
});

// DELETE endpoint to clear messages
app.delete('/messages', async (req, res) => {
    try {
        await Message.deleteMany({});
        res.sendStatus(204);
    } catch (err) {
        console.error('Error clearing messages:', err);
        res.sendStatus(500);
    }
});

// POST endpoint to save a new message
app.post('/messages', async (req, res) => {
    const { name, message, recipient } = req.body;

    if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required.' });
    }

    try {
        const newMessage = new Message({ name, message, recipient });
        await newMessage.save();

        if (recipient) {
            // Emit private message to the recipient
            io.to(recipient).emit('privateMessage', newMessage.toObject());
        } else {
            // Emit public message to all clients
            io.emit('message', { ...newMessage.toObject(), timestamp: newMessage.timestamp.toISOString() });
        }

        res.sendStatus(200);
    } catch (err) {
        console.error('Error saving message:', err);
        res.sendStatus(500);
    }
});

// Socket.io connection handler
io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('register', (name) => {
        socket.username = name; // Store username in the socket
        socket.join(name); // Join a room with their name for private messaging
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
