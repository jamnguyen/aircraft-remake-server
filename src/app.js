import Express from 'express';
import HTTP from 'http';
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
  if (db.hasUsername(username)) {
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
  const user = db.add(id, { id, username });

  io.to(socket.id).emit(
    Message.CONNECT_SUCCESS,
    user
  );

  socket.on(Message.USER_CHANGE, (newData) => {
    db.update(id, newData);

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

  // -------------------------------------
  // BATTLE REQUEST
  // Challenger -> Opponent
  socket.on(Message.BATTLE_REQUEST, (opponentId) => {
    let challenger = db.getUser(socket.id);
    let opponent = db.getUser(opponentId);

    if (opponent.status !== Status.AVAILABLE || challenger.status !== Status.AVAILABLE) {
      // @TODO: Maybe improved by sending error
      return;
    }

    challenger = db.update(
      challenger.id,
      {
        status: Status.BATTLE_REQUEST,
        opponentId: opponent.id,
      }
    );

    opponent = db.update(
      opponent.id,
      {
        status: Status.BATTLE_REQUEST,
        opponentId: challenger.id,
      }
    );

    io.to(`${opponent.id}`).emit(
      Message.BATTLE_REQUEST,
      {
        message: `${challenger.username} challenges you for a battle!`,
        opponent: challenger,
      }
    );

    updateAvailables(db, io, socket);
  });

  // Cancel request
  socket.on(Message.BATTLE_REQUEST_CANCEL, (opponentId) => {
    let challenger = db.getUser(socket.id);
    let opponent = db.getUser(opponentId);

    challenger = db.update(
      challenger.id,
      {
        status: Status.AVAILABLE,
        opponentId: null,
      }
    );

    opponent = db.update(
      opponent.id,
      {
        status: Status.AVAILABLE,
        opponentId: null,
      }
    );

    io.to(`${opponent.id}`).emit(
      Message.BATTLE_REQUEST_CANCEL,
      {
        message: `${challenger.username} doesn't want a battle with you anymore.`
      }
    );

    updateAvailables(db, io, socket);
  });

  // Challenge accepted opponent -> challenger
  socket.on(Message.BATTLE_ACCEPTED, (challengerId) => {
    let opponent = db.getUser(socket.id);
    let challenger = db.getUser(challengerId);

    db.update(opponent.id, { status: Status.BOARD_SETUP });
    db.update(challenger.id, { status: Status.BOARD_SETUP });

    io.to(`${challenger.id}`).emit(Message.BATTLE_ACCEPTED);
    updateAvailables(db, io, socket);
  });

  // Challenge rejected
  socket.on(Message.BATTLE_REJECTED, (challengerId) => {
    let opponent = db.getUser(socket.id);
    let challenger = db.getUser(challengerId);

    db.update(opponent.id, { status: Status.AVAILABLE, opponentId: null });
    db.update(challenger.id, { status: Status.AVAILABLE, opponentId: null });

    io.to(`${challenger.id}`).emit(
      Message.BATTLE_REJECTED,
      {
        message: `${opponent.username} has rejected your request.`
      }
    );
    updateAvailables(db, io, socket);
  });

  // -------------------------------------
});

// ----------------------------------------------
// UTILS
// ----------------------------------------------
function updateAvailables(_db, _io, _socket) {
  const availables = _db.getArray().filter(user =>
    user.status === Status.AVAILABLE
    || user.status === Status.BATTLE_REQUEST
  );

  // Send to connected user id and available users list
  _io.to(_socket.id).emit(
    Message.AVAILABLE_LIST,
    availables
  );

  // Send to other users available users list
  _socket.broadcast.emit(
    Message.AVAILABLE_LIST,
    availables
  );
}

server.listen(PORT, () => {
  console.log(`Aircraft Server is listening at port ${PORT}...`);
});
