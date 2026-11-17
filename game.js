const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const restartBtn = document.getElementById("restartBtn");

// --- Configuración (unidades por SEGUNDO, no por fotograma) ---
// Así el juego corre igual en una pantalla de 60 Hz que en una de 120 Hz.
const GROUND_Y = canvas.height - 60; // altura del suelo
const GRAVITY = 2200; // px/s²  (qué tan rápido cae)
const JUMP_FORCE = -760; // px/s   (impulso del salto)
const START_SPEED = 300; // px/s   (velocidad inicial de los obstáculos)
const ACCELERATION = 10; // px/s cada segundo (dificultad progresiva)
const POINTS_PER_SECOND = 10;

// --- Nuevas variables para los botones de color ---
const colorButtons = [
  { x: 10, y: 10, width: 30, height: 30, color: "#38bdf8" }, // Azul (original)
  { x: 50, y: 10, width: 30, height: 30, color: "#a3e635" }, // Verde
  { x: 90, y: 10, width: 30, height: 30, color: "#fbbf24" }, // Amarillo
];

// --- Cambio automático de color del jugador ---
const COLOR_INTERVAL = 5; // segundos entre cada cambio de color mientras se juega
let colorTimer = 0; // segundos acumulados desde el último cambio de color

// --- Estado del juego ---
// 'ready' = esperando el primer toque · 'playing' = jugando · 'over' = perdiste
let state, player, obstacles, score, speed, spawnTimer, lastTime;
let best = Number(leerRecord()) || 0;

function initGame() {
  player = {
    x: 80,
    y: GROUND_Y - 40,
    width: 40,
    height: 40,
    vy: 0,
    jumping: false,
    color: colorButtons[0].color, // Asignamos el color inicial (Azul)
  };
  obstacles = [];
  score = 0;
  speed = START_SPEED;
  spawnTimer = 1; // segundos hasta el primer obstáculo
  colorTimer = 0;
  state = "ready";
  restartBtn.hidden = true;
  actualizarHUD();
}

// --- Entrada del usuario (teclado, mouse y pantalla táctil) ---
function onInput() {
  if (state === "ready") {
    state = "playing";
  }
  if (state === "over") {
    initGame();
    return;
  }
  jump();
}

function jump() {
  if (!player.jumping) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    onInput();
  }
});

// Evento pointerdown actualizado para detectar clics en los botones
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();

  // Obtener posición del clic relativa al canvas
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  let tocoBoton = false;

  // Revisar si el clic está dentro de algún botón
  for (const btn of colorButtons) {
    if (
      clickX >= btn.x &&
      clickX <= btn.x + btn.width &&
      clickY >= btn.y &&
      clickY <= btn.y + btn.height
    ) {
      player.color = btn.color; // Cambiar color del jugador
      tocoBoton = true;
      break;
    }
  }

  // Si no tocó ningún botón, realizar la acción normal del juego (saltar/iniciar)
  if (!tocoBoton) {
    onInput();
  }
});

restartBtn.addEventListener("click", initGame);

// --- Generación de obstáculos ---
function spawnObstacle() {
  const width = 30 + Math.random() * 30; // entre 30 y 60 px
  const height = 30 + Math.random() * 30; // entre 30 y 60 px
  obstacles.push({
    x: canvas.width, // aparece en el borde derecho
    y: GROUND_Y - height, // apoyado sobre el suelo
    width,
    height,
  });
}

// --- Colisión entre dos rectángulos ---
function colisiona(a, b) {
  return (
    a.x < b.x + b.width && // izquierda de a, antes de la derecha de b
    a.x + a.width > b.x && // derecha de a, después de la izquierda de b
    a.y < b.y + b.height && // arriba de a, sobre la base de b
    a.y + a.height > b.y // base de a, debajo de la parte de arriba de b
  );
}

// --- Actualización: dt = segundos desde el fotograma anterior ---
function update(dt) {
  if (state !== "playing") return;

  // Física del jugador
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  if (player.y >= GROUND_Y - player.height) {
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.jumping = false;
  }

  // Mover obstáculos hacia la izquierda
  obstacles.forEach((o) => {
    o.x -= speed * dt;
  });

  // Elimina los obstáculos que ya salieron por la izquierda
  obstacles = obstacles.filter((o) => o.x + o.width > 0);

  // Revisar si el jugador chocó con algún obstáculo
  if (obstacles.some((o) => colisiona(player, o))) {
    terminarPartida();
    return;
  }

  // Puntuación y dificultad progresiva
  score += POINTS_PER_SECOND * dt;
  speed += ACCELERATION * dt;
  actualizarHUD();

  // Condición de color: cada COLOR_INTERVAL segundos el jugador pasa al siguiente color
  colorTimer += dt;
  if (colorTimer >= COLOR_INTERVAL) {
    colorTimer = 0;
    cambiarColor();
  }

  // Generar un obstáculo cada 1.1 a 1.8 segundos
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = 1.1 + Math.random() * 0.7;
  }
}

// --- Pasa al siguiente color de colorButtons (vuelve al primero al llegar al final) ---
function cambiarColor() {
  const i = colorButtons.findIndex((b) => b.color === player.color);
  player.color = colorButtons[(i + 1) % colorButtons.length].color;
}

function terminarPartida() {
  state = "over";
  restartBtn.hidden = false;
  if (Math.floor(score) > best) {
    best = Math.floor(score);
    guardarRecord(best);
  }
  actualizarHUD();
}

function actualizarHUD() {
  scoreEl.textContent = "Puntos: " + Math.floor(score);
  bestEl.textContent = "Récord: " + best;
}

// --- Dibujo ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Suelo
  ctx.fillStyle = "#334155";
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  // Jugador (ahora usa la propiedad player.color)
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Obstáculos
  ctx.fillStyle = "#f87171";
  obstacles.forEach((o) => ctx.fillRect(o.x, o.y, o.width, o.height));

  // --- Dibujar los botones de colores ---
  colorButtons.forEach((btn) => {
    ctx.fillStyle = btn.color;
    ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
    // Borde blanco para que destaquen en el fondo
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  });

  // Mensajes
  if (state === "ready") mensaje("Toca o presiona Espacio para empezar", "");
  if (state === "over")
    mensaje(
      "¡Game Over!",
      "Puntos: " + Math.floor(score) + " · Toca para reintentar",
    );
}

function mensaje(titulo, subtitulo) {
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.font = "bold 30px system-ui, sans-serif";
  ctx.fillText(titulo, canvas.width / 2, canvas.height / 2);
  if (subtitulo) {
    ctx.font = "18px system-ui, sans-serif";
    ctx.fillText(subtitulo, canvas.width / 2, canvas.height / 2 + 40);
  }
}

// --- Bucle principal (siempre activo; calcula dt) ---
function loop(now) {
  // Limitamos dt a 0.05 s para que el juego no "salte" al volver de otra pestaña
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// --- Récord guardado en el dispositivo (protegido por si el almacenamiento falla) ---
function leerRecord() {
  try {
    return localStorage.getItem("runner-record");
  } catch {
    return 0;
  }
}
function guardarRecord(valor) {
  try {
    localStorage.setItem("runner-record", valor);
  } catch {
    /* sin almacenamiento */
  }
}

// --- Arranque ---
initGame();
requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(loop);
});
