const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Event = require('./models/Event');
const { encryptMessage } = require('./utils/encryption');

let io;
let globalActiveUsers = new Set();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust for production security
      methods: ['GET', 'POST'],
    },
  });

  // Middleware for Auth - now optional to allow global traffic tracking
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        // Allow connection as anonymous
        socket.user = null;
        return next();
      }

      const jwtSecret = process.env.JWT_SECRET || 'default-jwt-secret-for-development';
      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error('Socket Auth Error:', err.message);
      // Still allow connection but as guest
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    // Track globally active users (by userId if authenticated, else socket.id)
    const userIdOrSocketId = socket.user?.id || socket.id;
    globalActiveUsers.add(userIdOrSocketId);

    // Broadcast active count to admins whenever someone connects
    io.to('admin_room').emit('active_users_count', globalActiveUsers.size);

    console.log(`Socket connected: ${userIdOrSocketId}. Total active: ${globalActiveUsers.size}`);

    // Join a room specific to the user (for receiving messages)
    if (socket.user && socket.user.id) {
      socket.join(socket.user.id);
      
      // Notify friends that user is online
      socket.broadcast.emit('user_online', socket.user.id);

      // 📥 Mark undelivered messages as delivered when user connects
      (async () => {
        try {
          const mongoose = require('mongoose');
          if (mongoose.connection.readyState !== 1) {
            console.log('[Socket] DB not ready, skipping auto-marking delivery for now');
            return;
          }
          const undelivered = await Message.find({ receiver: socket.user.id, delivered: false });
          if (undelivered.length > 0) {
            await Message.updateMany(
              { receiver: socket.user.id, delivered: false },
              { $set: { delivered: true, deliveredAt: new Date() } }
            );
            
            // Notify senders that their messages were delivered
            const senderIds = [...new Set(undelivered.map(m => m.sender.toString()))];
            senderIds.forEach(senderId => {
              io.to(senderId).emit('messages_delivered', { receiverId: socket.user.id });
            });
          }
        } catch (err) { console.error('Error auto-marking delivery:', err); }
      })();
    }

    // Handle incoming private message
    socket.on('send_message', async (data) => {
      try {
        const { receiverId, content, type, metadata } = data;
        const senderId = socket.user?.id;
        if (!senderId) return;

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
          type: type || 'text',
          metadata: metadata || {},
          read: false,
        });

        // 3. Check if receiver is online
        const receiverRoom = io.sockets.adapter.rooms.get(receiverId);
        const isOnline = receiverRoom && receiverRoom.size > 0;

        if (isOnline) {
          message.delivered = true;
          message.deliveredAt = new Date();
          await message.save();
        }

        // 4. Emit to Receiver
        io.to(receiverId).emit('receive_message', {
          _id: message._id,
          sender: senderId,
          receiver: receiverId,
          content: content,
          type: type || 'text',
          metadata: metadata || {},
          createdAt: message.createdAt,
          delivered: message.delivered,
          read: message.read,
        });

        // 5. Ack to Sender
        socket.emit('message_sent', {
          tempId: data.tempId,
          _id: message._id,
          content: content,
          type: type || 'text',
          metadata: metadata || {},
          createdAt: message.createdAt,
          delivered: message.delivered,
          read: message.read,
        });
      } catch (err) {
        console.error('Socket message error:', err);
        socket.emit('message_error', { error: 'Failed to send' });
      }
    });

    // Handle delivery acknowledgement from receiver
    socket.on('message_delivered_ack', async ({ messageId, senderId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, { delivered: true, deliveredAt: new Date() });
        io.to(senderId).emit('message_delivered', { messageId, receiverId: socket.user?.id });
      } catch (err) { console.error('delivered_ack error', err); }
    });

    // Handle read receipt
    socket.on('mark_read', async ({ friendId }) => {
      try {
        const userId = socket.user?.id;
        if (!userId || !friendId) return;

        const result = await Message.updateMany(
          { sender: friendId, receiver: userId, read: false },
          { $set: { read: true, readAt: new Date() } }
        );

        if (result.modifiedCount > 0) {
          // Notify the friend that their messages were read
          io.to(friendId).emit('messages_read', { readerId: userId });
        }
      } catch (err) { console.error('mark_read error', err); }
    });

    // --- Live Event Engagement ---
    socket.on('join_event_room', (eventId) => {
      socket.join(`event_${eventId}`);
    });

    socket.on('toggle_qa', async ({ eventId, isActive }) => {
      try {
        await Event.updateOne({ _id: eventId }, { 'liveEngagement.isQaActive': isActive });
        io.to(`event_${eventId}`).emit('qa_status_changed', isActive);
      } catch (err) { console.error('toggle_qa error', err); }
    });

    socket.on('ask_question', async ({ eventId, question }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev || !socket.user) return;
        const newQ = {
          studentId: socket.user.id,
          studentName: socket.user.fullname || socket.user.name || 'Anonymous',
          question,
          upvotes: 0,
          upvotedBy: []
        };
        ev.liveEngagement.qaList.push(newQ);
        await ev.save();
        io.to(`event_${eventId}`).emit('new_question', ev.liveEngagement.qaList[ev.liveEngagement.qaList.length - 1]);
      } catch (err) { console.error('ask_question error', err); }
    });

    socket.on('upvote_question', async ({ eventId, questionId }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;
        const q = ev.liveEngagement.qaList.id(questionId);
        if (!q || !socket.user) return;

        // Prevent double upvoting
        if (!q.upvotedBy.includes(socket.user.id)) {
          q.upvotedBy.push(socket.user.id);
          q.upvotes += 1;
          await ev.save();
          io.to(`event_${eventId}`).emit('question_upvoted', { questionId, upvotes: q.upvotes });
        }
      } catch (err) { console.error('upvote_question error', err); }
    });

    socket.on('mark_answered', async ({ eventId, questionId }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;
        const q = ev.liveEngagement.qaList.id(questionId);
        if (q) {
          q.answered = true;
          await ev.save();
          io.to(`event_${eventId}`).emit('question_answered', { questionId, reply: q.reply });
        }
      } catch (err) { console.error('mark_answered error', err); }
    });

    socket.on('reply_question', async ({ eventId, questionId, reply }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;
        const q = ev.liveEngagement.qaList.id(questionId);
        if (q) {
          q.answered = true;
          q.reply = reply;
          await ev.save();
          io.to(`event_${eventId}`).emit('question_answered', { questionId, reply });
        }
      } catch (err) { console.error('reply_question error', err); }
    });

    // --- Polls ---
    socket.on('create_poll', async ({ eventId, question, options }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;

        // Close any currently active polls
        ev.liveEngagement.polls.forEach(p => p.isActive = false);

        const newPoll = {
          question,
          options: options.map(opt => ({ text: opt, votes: 0 })),
          isActive: true,
          voters: []
        };
        ev.liveEngagement.polls.push(newPoll);
        await ev.save();

        const savedPoll = ev.liveEngagement.polls[ev.liveEngagement.polls.length - 1];
        io.to(`event_${eventId}`).emit('poll_created', savedPoll);
      } catch (err) { console.error('create_poll error', err); }
    });

    socket.on('vote_poll', async ({ eventId, pollId, optionId }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;

        const poll = ev.liveEngagement.polls.id(pollId);
        if (!poll || !poll.isActive || !socket.user) return;

        // Duplicate Vote Prevention
        if (poll.voters.includes(socket.user.id)) {
          socket.emit('poll_error', { message: 'You have already voted in this poll.' });
          return;
        }

        const opt = poll.options.id(optionId);
        if (!opt) return;

        opt.votes += 1;
        poll.voters.push(socket.user.id);
        await ev.save();

        io.to(`event_${eventId}`).emit('poll_updated', { pollId, options: poll.options });
      } catch (err) { console.error('vote_poll error', err); }
    });

    socket.on('close_poll', async ({ eventId, pollId }) => {
      try {
        const ev = await Event.findById(eventId);
        if (!ev) return;
        const poll = ev.liveEngagement.polls.id(pollId);
        if (poll) {
          poll.isActive = false;
          await ev.save();
          io.to(`event_${eventId}`).emit('poll_closed', pollId);
        }
      } catch (err) { console.error('close_poll error', err); }
    });

    // --- Heatmap & Traffic Tracking ---
    socket.on('join_admin_room', () => {
      // Basic security check: ideally we'd verify the token payload here natively,
      // but for now, we trust the client to only emit this if they are an admin.
      if (socket.user && socket.user.role === 'admin') {
        socket.join('admin_room');
        // Immediately send current count
        socket.emit('active_users_count', globalActiveUsers.size);
      }
    });

    socket.on('track_click', (data) => {
      // data: { x, y, path, timestamp }
      io.to('admin_room').emit('new_click', data);
    });

    socket.on('disconnect', () => {
      // Remove from global active count
      const userIdOrSocketId = socket.user?.id || socket.id;
      globalActiveUsers.delete(userIdOrSocketId);

      // Update admins
      io.to('admin_room').emit('active_users_count', globalActiveUsers.size);

      socket.broadcast.emit('user_offline', socket.user?.id);
    });
  });

  return io;
};

module.exports = { initSocket };
