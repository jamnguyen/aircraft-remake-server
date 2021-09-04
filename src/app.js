import Express from 'express';
import HTTP from 'http';
import { v4 as uuid } from 'uuid';
import { Server as Websocket } from 'socket.io';
import UserManager from './UserManager.js';
import { getSlugFromUsername } from './utils.js';
import Status from './constants/statuses.js';
import Message from './constants/messages.js';

// SETUP
const PORT = 8000;
const app = Express();
const server = HTTP.createServer(app);
const io = new Websocket(server);

console.log(`Aircraft Server wake up at ${(new Date()).toUTCString()}`);
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});
app.use(Express.json());

// ----------------------------------------------
// DATA
// ----------------------------------------------
const db = new UserManager();

// ----------------------------------------------
// AUTH
// ----------------------------------------------
app.get('/verify-username/:username', (req, res) => {
  const username = req.params.username;

  // Verify param
  if (!username) {
    res.status(400).json({
      message: 'Username required!'
    });

    return;
  }

  // Check exist
  if (db.hasSlug(getSlugFromUsername(username))) {
    res.status(400).json({
      message: 'Username exists!',
    });
    
    return;
  }

  res.json({
    message: 'Username is good to go!'
  });
});

// ----------------------------------------------
// MANAGEMENT
// ----------------------------------------------
app.get('/', (req, res) => {
  res.json(`Hello from Jam. :) This is Aircraft Remake server.`);
});

// ----------------------------------------------
// IO
// ----------------------------------------------
io.on('connection', (socket) => {
  // Add new user
  const { username } = socket.handshake.query;
  const id = socket.id;
  const slug = getSlugFromUsername(username);
  const user = { id, username, slug, status: Status.PENDING };
  db.add(id, user);

  io.to(socket.id).emit(
    Message.CONNECT_SUCCESS,
    user
  );

  socket.on(Message.USER_CHANGE, (newData) => {
    const payload = newData;
    if (newData.username) {
      payload.slug = getSlugFromUsername(newData.username);
    }
    db.update(id, payload);

    const availables = db.getArray().filter(user =>
      user.status === Status.AVAILABLE
    );

    // Send to connected user id and available users list
    io.to(socket.id).emit(
      Message.AVAILABLE_LIST,
      availables
    );

    // Send to other users available users list
    socket.broadcast.emit(
      Message.AVAILABLE_LIST,
      availables
    );
  });

  // Request a game with user has opponentId
  // socket.on(MESSAGE.US_CHALLENGE, (opponentId) => {
  //   const challenger = users.find(user => user.id === socket.id);
  //   const opponent = users.find(user => user.id === opponentId);

  //   if (challenger) {
  //     challenger.status = opponentId;
  //   }
  //   if (opponent) {
  //     opponent.status = challenger.id;
  //   }

  //   io.to(`${opponentId}`).emit(
  //     MESSAGE.US_CHALLENGE,
  //     challenger
  //   );

  //   io.emit(MESSAGE.US_UPDATE_USER_LIST, users.filter(user => user.status === STATUS.AVAILABLE));
  // });
});

server.listen(PORT, () => {
  console.log(`Aircraft Server is listening at port ${PORT}...`);
});
