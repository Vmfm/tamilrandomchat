const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  x: 100,
  y: canvas.height - 150,
  width: 50,
  height: 50,
  color: "gold",
  dy: 0,
  jumpPower: -15,
  gravity: 0.8,
  grounded: false,
};

let obstacles = [];
let frame = 0;
let speed = 6;

function spawnObstacle() {
  let size = Math.random() * 30 + 20;
  obstacles.push({
    x: canvas.width,
    y: canvas.height - size - 100,
    width: size,
    height: size,
    color: "brown",
  });
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

function drawObstacles() {
  for (let obs of obstacles) {
    ctx.fillStyle = obs.color;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
  }
}

function updateObstacles() {
  for (let obs of obstacles) {
    obs.x -= speed;
  }
  obstacles = obstacles.filter(o => o.x + o.width > 0);
}

function checkCollision() {
  for (let obs of obstacles) {
    if (
      player.x < obs.x + obs.width &&
      player.x + player.width > obs.x &&
      player.y < obs.y + obs.height &&
      player.y + player.height > obs.y
    ) {
      alert("Game Over!");
      document.location.reload();
    }
  }
}

function jump() {
  if (player.grounded) {
    player.dy = player.jumpPower;
    player.grounded = false;
  }
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") jump();
});

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Gravity
  player.dy += player.gravity;
  player.y += player.dy;

  // Ground collision
  if (player.y + player.height >= canvas.height - 100) {
    player.y = canvas.height - player.height - 100;
    player.dy = 0;
    player.grounded = true;
  }

  drawPlayer();

  if (frame % 90 === 0) {
    spawnObstacle();
  }

  updateObstacles();
  drawObstacles();
  checkCollision();

  frame++;
  requestAnimationFrame(gameLoop);
}

gameLoop();
