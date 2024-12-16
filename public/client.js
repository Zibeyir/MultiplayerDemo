const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const socket = io();

let players = {};
let playerColors = {};
let myId = null;
let selected = false;
let selectedBallNum = 0;
let closestBallIndex = -1;

canvas.addEventListener('click', (event) => {
    if (myId && players[myId]) {
      const rect = canvas.getBoundingClientRect();
      const targetX = event.clientX - rect.left;
      const targetY = event.clientY - rect.top;

      // Find the closest ball
      let closestDistance = Infinity;

      players[myId].forEach((ball, index) => {
        const dx = targetX - ball.x;
        const dy = targetY - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < ball.radius) {
          closestDistance = distance;
          closestBallIndex = index;
          selected = true;
          selectedBallNum++;
          console.log("Distance"+selected+" "+selectedBallNum+" "+closestBallIndex);
        }
      });
      console.log("Finish 1 :"+selected+" "+selectedBallNum+" "+closestBallIndex);

      if (selectedBallNum===0 && selected && closestBallIndex !== -1) {
        console.log("Move"+selected+" "+selectedBallNum);

        socket.emit('moveBall', {
          ballIndex: closestBallIndex,
          targetX,
          targetY,
        });
        selected = false;
        closestBallIndex = -1;

      }
      selectedBallNum=0;
      console.log("Finish 2 :"+selected+" "+selectedBallNum+" "+closestBallIndex);

    }
  });

socket.on("initialize", (data) => {
  players = data.players;
  playerColors = data.playerColors;
  myId = socket.id;
});

socket.on("newPlayer", (data) => {
  players[data.id] = data.balls;
  playerColors[data.id] = data.color;
});

socket.on("playerDisconnected", (id) => {
  delete players[id];
  delete playerColors[id];
});

socket.on("stateUpdate", (data) => {
  players = data.players;
  playerColors = data.playerColors;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const playerId in players) {
    players[playerId].forEach((ball) => {
      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = playerColors[playerId];
      ctx.fill();
      ctx.closePath();

      // Draw score
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ball.score.toFixed(0), ball.x, ball.y);
    });
  }

  requestAnimationFrame(draw);
}

draw();
