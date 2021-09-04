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
app.post('/login', (req, res) => {
  if (!req.body || !req.body.username) {
    res.status(400).json({
      message: 'Username required!'
    });

    return;
  }

  const { username } = req.body;
  const id = uuid();
  const slug = getSlugFromUsername(username);

  // Check exist
  if (db.hasSlug(slug)) {
    res.status(400).json({
      message: 'Username exists!',
    });
    
    return;
  }

  // Check limit
  if (db.isExceeded()) {
    res.status(400).json({
      message: 'So sad, the airport is full at the moment, please come back later. :(',
    });
    
    return;
  }

  const user = { id, username, slug, status: Status.PENDING };
  db.add(id, user);
  res.json({
    message: 'Log in success!',
    user: { id, username },
  });
});

app.post('/logout', (req, res) => {
  if (!req.body || !req.body.id) {
    res.status(400).json({
      message: 'ID required!'
    });

    return;
  }

  const { id } = req.body;

  if (!db.hasId(id)) {
    res.status(400).json({
      message: 'User does not exist.'
    });

    return;
  }

  const loggedOutUser = db.getUser(id);
  delete loggedOutUser.status;
  db.delete(id);

  res.json({
    message: 'Log out success!',
    user: loggedOutUser,
  });
});

app.patch('/update/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      message: 'ID required!'
    });

    return;
  }

  if (!req.body) {
    res.status(400).json({
      message: 'Body required!'
    });

    return;
  }

  if (!db.hasId(id)) {
    res.status(400).json({
      message: 'User does not exist!'
    });

    return;
  }

  const body = req.body;
  if (req.body.username) {
    body.slug = getSlugFromUsername(req.body.username);
  }

  db.update(id, req.body);
  res.json({
    message: 'Update success!',
    user: db.getUser(id),
  });
});

// ----------------------------------------------
// MANAGEMENT
// ----------------------------------------------
app.get('/', (req, res) => {
  res.json(`Hello from Jam. :) This is Aircraft Remake server.`);
});

app.get('/users', (req, res) => {
  res.json({
    users: db.getArray()
  });
});

// ----------------------------------------------
// IO
// ----------------------------------------------
io.on('connection', (socket) => {
  // On user handshake
  db.update(socket.handshake.query.id, {
    socketId:  socket.id,
    status: Status.AVAILABLE
  });

  const currentUser = db.getUser(socket.handshake.query.id);
  const availables = db.getArray().filter(user => user.status === Status.AVAILABLE);

  // Send to connected user id and available users list
  io.to(`${socket.id}`).emit(
    Message.USER_CONNECTED,
    {
      user: currentUser,
      availables,
    }
  );

  // Send to other users available users list
  socket.broadcast.emit(
    Message.AVAILABLE_LIST,
    availables
  );

  // Request a game with user has opponentId
  socket.on(MESSAGE.US_CHALLENGE, (opponentId) => {
    const challenger = users.find(user => user.id === socket.id);
    const opponent = users.find(user => user.id === opponentId);

    if (challenger) {
      challenger.status = opponentId;
    }
    if (opponent) {
      opponent.status = challenger.id;
    }

    io.to(`${opponentId}`).emit(
      MESSAGE.US_CHALLENGE,
      challenger
    );

    io.emit(MESSAGE.US_UPDATE_USER_LIST, users.filter(user => user.status === STATUS.AVAILABLE));
  });
});

app.listen(PORT, () => {
  console.log(`Aircraft Server is listening at port ${PORT}...`);
});
