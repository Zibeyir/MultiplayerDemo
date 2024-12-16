// server.js (Node.js Server)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const players = {}; // Store player data
const playerColors = {}; // Store unique player colors

// Generate a random color
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Assign a unique color to the player
  playerColors[socket.id] = getRandomColor();

  // Initialize player balls
  players[socket.id] = Array(5).fill(0).map(() => ({
    x: Math.random() * 800,
    y: Math.random() * 600,
    radius: 20,
    score: 50,
    targetX: null,
    targetY: null,
  }));

  // Send the current players to the newly connected player
  socket.emit('initialize', { players, playerColors });

  // Broadcast new player to others
  socket.broadcast.emit('newPlayer', { id: socket.id, balls: players[socket.id], color: playerColors[socket.id] });

  // Handle movement updates
  socket.on('moveBall', ({ ballIndex, targetX, targetY }) => {
    if (players[socket.id] && players[socket.id][ballIndex]) {
      players[socket.id][ballIndex].targetX = targetX;
      players[socket.id][ballIndex].targetY = targetY;
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    delete playerColors[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

// Periodically increase ball scores
setInterval(() => {
  for (const playerId in players) {
    players[playerId].forEach((ball) => {
      ball.score += 2;
      ball.radius = 20 + ball.score * 0.1; // Increase size with score
    });
  }
}, 4000); // Every 4 seconds

// Update game state and broadcast it to players
setInterval(() => {
  for (const playerId in players) {
    players[playerId].forEach((ball, ballIndex) => {
      // Movement logic
      if (ball.targetX !== null && ball.targetY !== null) {
        const dx = ball.targetX - ball.x;
        const dy = ball.targetY - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
          const speed = 2;
          ball.x += (dx / distance) * speed;
          ball.y += (dy / distance) * speed;
        } else {
          ball.targetX = null;
          ball.targetY = null;
        }
      }

      // Collision logic
      for (const otherPlayerId in players) {
        if (playerId !== otherPlayerId) {
          players[otherPlayerId].forEach((otherBall, otherBallIndex) => {
            const dx = otherBall.x - ball.x;
            const dy = otherBall.y - ball.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ball.radius + otherBall.radius) {
              const damage = 0.5; // Gradual score decrease on collision
              ball.score = Math.max(0, ball.score - damage);
              otherBall.score = Math.max(0, otherBall.score - damage);

              // Update size based on score
              ball.radius = 20 + ball.score * 0.1;
              otherBall.radius = 20 + otherBall.score * 0.1;

              // Handle ball death
              if (ball.score === 0) {
                players[otherPlayerId].push({
                  x: ball.x,
                  y: ball.y,
                  radius: 20,
                  score: 50,
                  targetX: null,
                  targetY: null,
                });
                players[playerId].splice(ballIndex, 1);
              }

              if (otherBall.score === 0) {
                players[playerId].push({
                  x: otherBall.x,
                  y: otherBall.y,
                  radius: 20,
                  score: 50,
                  targetX: null,
                  targetY: null,
                });
                players[otherPlayerId].splice(otherBallIndex, 1);
              }
            }
          });
        }
      }
    });
  }

  io.emit('stateUpdate', { players, playerColors });
}, 16); // ~60 FPS

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000/');
});
