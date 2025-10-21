import { Server } from 'socket.io';
import User from '../models/User.js';
import CommunityMember from '../models/communityMember.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

/**
 * Call initSocket(server, verifyJWT) from server bootstrap.
 * verifyJWT(token) should return userId (throw on invalid).
 */
let ioInstance = null;

export const initSocket = (server, verifyJWT) => {
  if (ioInstance) return ioInstance; // idempotent
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  io.use(async (socket, next) => {
    try {
      // Support both JWT and session-based authentication
      const token = socket.handshake.auth?.token;
      const userId = socket.handshake.auth?.userId;
      
      if (token) {
        // JWT authentication
        const userId = verifyJWT(token);
        const user = await User.findById(userId);
        if (!user) return next(new Error('User not found'));
        socket.user = user;
        next();
      } else if (userId) {
        // Direct user ID authentication (for session-based systems)
        const user = await User.findById(userId);
        if (!user) return next(new Error('User not found'));
        socket.user = user;
        next();
      } else {
        return next(new Error('Authentication error'));
      }
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected for user ${socket.user.username} (${userId}), socketId=${socket.id}`);

    // Update user's last seen (isOnline is handled by login/logout)
    await User.findByIdAndUpdate(userId, {
      lastSeenAt: new Date()
    });
    console.log(`Socket connect: Updated user ${userId} lastSeenAt`);

    // Join per-user room (for direct delivery)
    socket.join(`user-${userId}`);

    // Join community room if user has a community
    if (socket.user.community) {
      socket.join(`community-${socket.user.community.toString()}`);
    }

    // Emit user online status to admin room
    io.to('admin-room').emit('userOnlineStatusChanged', {
      userId,
      isOnline: true,
      lastSeenAt: new Date(),
      username: socket.user.username
    });

    // Set up a ping mechanism to detect if user is still connected
    socket.pingTimeout = setTimeout(async () => {
      console.log(`User ${userId} ping timeout - marking as offline`);
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeenAt: new Date()
      });
      
      io.to('admin-room').emit('userOnlineStatusChanged', {
        userId,
        isOnline: false,
        lastSeenAt: new Date(),
        username: socket.user.username
      });
    }, 30000); // 30 seconds timeout

    // Optional: allow client to join specific chat rooms (e.g. when opening a chat)
    socket.on('joinChat', async ({ chatId }) => {
      if (!chatId) return;
      // Optional permission check could be added here
      socket.join(`chat-${chatId}`);
    });

    socket.on('leaveChat', ({ chatId }) => {
      if (!chatId) return;
      socket.leave(`chat-${chatId}`);
    });

    // Join community room for public chat
    socket.on('joinCommunityRoom', async ({ communityId }) => {
      if (!communityId) return;
      console.log(`User ${socket.user.username} joining community room: ${communityId}`);
      socket.join(`community-${communityId}`);
    });

    socket.on('leaveCommunityRoom', ({ communityId }) => {
      if (!communityId) return;
      socket.leave(`community-${communityId}`);
    });

    // Typing indicator
    socket.on('typing', ({ chatId, isTyping }) => {
      if (!chatId) return;
      socket.to(`chat-${chatId}`).emit('typing', { userId, isTyping });
    });

    // Socket-level private/community message handlers
    socket.on('privateMessage', async (payload) => {
      try {
        // replicate logic you have in controllers or call service function
        // minimal version: create message, save, populate, emit
        const { recipientId, content, type = 'text', replyToId, forwardMessageId } = payload;
        if (!recipientId || !content) return;

        // find or create chat
        let chat = await Chat.findOne({ type: 'private', participants: { $all: [userId, recipientId], $size: 2 } });
        if (!chat) chat = await Chat.create({ type: 'private', participants: [userId, recipientId] });

        const messageData = { chat: chat._id, sender: socket.user._id, content, type };
        if (replyToId) messageData.replyTo = replyToId;
        if (forwardMessageId) {
          const original = await Message.findById(forwardMessageId);
          if (original) {
            messageData.forwardedFrom = original._id;
            messageData.originalSender = original.sender;
            messageData.content = original.content;
            messageData.type = original.type;
          }
        }

        const message = await Message.create(messageData);
        await Chat.findByIdAndUpdate(chat._id, { lastMessage: message.content, lastMessageAt: new Date() });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username role profile')
          .populate({ path: 'replyTo', select: 'content sender type' })
          .populate({ path: 'forwardedFrom', select: 'content sender type' });

        // Emit to chat room and user rooms
        io.to(`chat-${chat._id.toString()}`).emit('newMessage', populated);
        io.to(`user-${recipientId}`).emit('newMessage', populated);
        io.to(`user-${userId}`).emit('newMessage', populated);
      } catch (err) {
        console.error('privateMessage error', err);
      }
    });

    socket.on('communityMessage', async (payload) => {
      try {
        console.log(`Community message received from ${socket.user.username}:`, payload);
        const { communityId, content, type = 'text', replyToId, forwardMessageId } = payload;
        if (!communityId || !content) {
          console.log('Missing communityId or content, ignoring message');
          return;
        }

        // Check membership unless admin
        if (socket.user.role !== 'admin') {
          const membership = await CommunityMember.findOne({ community: communityId, user: socket.user._id });
          if (!membership) {
            console.log('User not a member of community, ignoring message');
            return;
          }
        }

        let chat = await Chat.findOne({ type: 'community', community: communityId });
        if (!chat) {
          console.log('Creating new community chat for community:', communityId);
          chat = await Chat.create({ type: 'community', community: communityId, participants: [socket.user._id] });
        }

        const messageData = { chat: chat._id, sender: socket.user._id, content, type };
        if (replyToId) messageData.replyTo = replyToId;
        if (forwardMessageId) {
          const original = await Message.findById(forwardMessageId);
          if (original) {
            messageData.forwardedFrom = original._id;
            messageData.originalSender = original.sender;
            messageData.content = original.content;
            messageData.type = original.type;
          }
        }

        const message = await Message.create(messageData);
        await Chat.findByIdAndUpdate(chat._id, { lastMessage: message.content, lastMessageAt: new Date() });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username role profile')
          .populate({ path: 'replyTo', select: 'content sender type' })
          .populate({ path: 'forwardedFrom', select: 'content sender type' });

        console.log('Broadcasting message to community room:', `community-${communityId}`);
        console.log('Broadcasting message to chat room:', `chat-${chat._id.toString()}`);

        // Broadcast to community room and chat room
        io.to(`community-${communityId}`).emit('newMessage', populated);
        io.to(`chat-${chat._id.toString()}`).emit('newMessage', populated);
        
        console.log('Message broadcasted successfully');
      } catch (err) {
        console.error('communityMessage error', err);
      }
    });

    // User activity heartbeat
    socket.on('userActivity', async () => {
      // Update lastSeenAt when user is active
      await User.findByIdAndUpdate(userId, {
        lastSeenAt: new Date()
      });
      
      // Reset ping timeout
      if (socket.pingTimeout) {
        clearTimeout(socket.pingTimeout);
        socket.pingTimeout = setTimeout(async () => {
          console.log(`User ${userId} ping timeout - updating lastSeenAt`);
          await User.findByIdAndUpdate(userId, {
            lastSeenAt: new Date()
          });
        }, 30000); // 30 seconds timeout
      }
    });

    // Handle ping from client
    socket.on('ping', () => {
      // Respond with pong
      socket.emit('pong');
      
      // Reset ping timeout when client pings
      if (socket.pingTimeout) {
        clearTimeout(socket.pingTimeout);
        socket.pingTimeout = setTimeout(async () => {
          console.log(`User ${userId} ping timeout - updating lastSeenAt`);
          await User.findByIdAndUpdate(userId, {
            lastSeenAt: new Date()
          });
        }, 30000); // 30 seconds timeout
      }
    });

    // Handle pong responses
    socket.on('pong', () => {
      // Reset ping timeout when client responds
      if (socket.pingTimeout) {
        clearTimeout(socket.pingTimeout);
        socket.pingTimeout = setTimeout(async () => {
          console.log(`User ${userId} ping timeout - updating lastSeenAt`);
          await User.findByIdAndUpdate(userId, {
            lastSeenAt: new Date()
          });
        }, 30000); // 30 seconds timeout
      }
    });

    // Admin user management events
    socket.on('joinAdminRoom', () => {
      if (socket.user.role === 'admin') {
        socket.join('admin-room');
        console.log(`Admin ${socket.user.username} joined admin room`);
      }
    });

    socket.on('leaveAdminRoom', () => {
      socket.leave('admin-room');
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected for user ${userId} (${socket.user.username})`);
      
      // Clear ping timeout
      if (socket.pingTimeout) {
        clearTimeout(socket.pingTimeout);
      }
      
      // Only update lastSeenAt (isOnline is handled by login/logout)
      await User.findByIdAndUpdate(userId, {
        lastSeenAt: new Date()
      });
      console.log(`Socket disconnect: Updated user ${userId} lastSeenAt`);
    });
  });

  ioInstance = io;
  return io;
};

export const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized — call initSocket first');
  return ioInstance;
};

// Real-time user management events
export const emitUserCreated = (user) => {
  const io = getIO();
  io.to('admin-room').emit('userCreated', user);
};

export const emitUserUpdated = (user) => {
  const io = getIO();
  io.to('admin-room').emit('userUpdated', user);
};

export const emitUserDeleted = (userId) => {
  const io = getIO();
  io.to('admin-room').emit('userDeleted', { userId });
};

export const emitUserStatusChanged = (user) => {
  const io = getIO();
  io.to('admin-room').emit('userStatusChanged', user);
};

export const emitUserPasswordChanged = (userId) => {
  const io = getIO();
  io.to('admin-room').emit('userPasswordChanged', { userId });
};

export const emitUserStatsUpdated = (stats) => {
  const io = getIO();
  io.to('admin-room').emit('userStatsUpdated', stats);
};

export default { initSocket, getIO, emitUserCreated, emitUserUpdated, emitUserDeleted, emitUserStatusChanged, emitUserPasswordChanged, emitUserStatsUpdated };