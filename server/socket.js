const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const { encryptMessage } = require('./utils/encryption');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust for production security
      methods: ['GET', 'POST'],
    },
  });

  // Middleware for Auth
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.id}`);

    // Join a room specific to the user (for receiving messages)
    socket.join(socket.user.id);

    // Notify friends that user is online (optional enhancement)
    socket.broadcast.emit('user_online', socket.user.id);

    // Handle incoming private message
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content } = data;
        const senderId = socket.user.id;

        if (!content || !receiverId) return;

        // 1. Encrypt Content
        const encrypted = encryptMessage(content);
        if (!encrypted) return;

        // 2. Save to DB
        const message = await Message.create({
          sender: senderId,
          receiver: receiverId,
          content: encrypted.content,
          iv: encrypted.iv,
          read: false,
        });

        // 3. Emit to Receiver (if online in their room)
        // We send the *decrypted* content (or just the clear text) to the receiver socket for immediate display
        // But for consistency, let's just send the struct and let client decrypt or send clear text if we trust the TLS tunnel.
        // For simplicity here: sending CLEAR text to the socket receiver so they see it instantly.
        // The DB stores encrypted.
        io.to(receiverId).emit('receive_message', {
          _id: message._id,
          sender: senderId,
          receiver: receiverId,
          content: content, // Real-time delivery is over TLS, sending clear text for immediate UI update
          createdAt: message.createdAt,
        });

        // 4. Ack to Sender
        socket.emit('message_sent', {
          tempId: data.tempId,
          _id: message._id,
          content: content,
          createdAt: message.createdAt,
        });
      } catch (err) {
        console.error('Socket message error:', err);
        socket.emit('message_error', { error: 'Failed to send' });
      }
    });

    socket.on('disconnect', () => {
      // console.log(`Socket disconnected: ${socket.user.id}`);
      socket.broadcast.emit('user_offline', socket.user.id);
    });
  });

  return io;
};

module.exports = { initSocket };
