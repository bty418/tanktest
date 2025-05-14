const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Listen on all available network interfaces
const port = 3000;

const app = next({ dev }); // Removed hostname and port from here for simpler Next.js app handling
const handle = app.getRequestHandler();

const players = {}; // Store player states: { id: { x, y, angle, color } }

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: `http://localhost:${port}`, // For local dev client
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    
    // Initialize player
    players[socket.id] = {
      id: socket.id,
      x: Math.floor(Math.random() * 700) + 50, // Random initial x (assuming 800x600 canvas)
      y: Math.floor(Math.random() * 500) + 50, // Random initial y
      angle: 0, // Angle in degrees, 0 is up
      color: `hsl(${Math.random() * 360}, 70%, 60%)` // Random vibrant color
    };

    // Send current list of players to the new player
    socket.emit('currentPlayers', players);
    
    // Announce the new player to all other players
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      delete players[socket.id];
      // Emit a message to all other players that this player has disconnected
      io.emit('playerDisconnected', socket.id);
    });

    // Listen for player movement updates
    socket.on('playerMovement', (movementData) => {
      if (players[socket.id]) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].angle = movementData.angle;
        // Broadcast the movement to all other players
        socket.broadcast.emit('playerMoved', players[socket.id]);
      }
    });

    // Placeholder for shooting
    socket.on('shoot', (bulletData) => {
      console.log(`Player ${socket.id} shot:`, bulletData);
      // Broadcast to other clients, handle bullet logic
      socket.broadcast.emit('bulletFired', { ...bulletData, shooterId: socket.id });
    });
  });

  httpServer
    .once('error', (err) => {
      console.error('Error starting server:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => { // Specify hostname here
      console.log(`> Server ready on http://${hostname}:${port}`);
      console.log(`> Next.js app ready on http://localhost:${port} (for local browser access)`);
    });
});

