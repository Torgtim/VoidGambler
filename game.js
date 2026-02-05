const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Tilpass canvas til skjerm
canvas.width = 400; 
canvas.height = 600;

let gameState = "PLAYING"; 
let wave = 1;
let credits = 0;
let player = {
    x: 180, y: 520, w: 40, h: 40,
    hp: 3, elixir: 0, maxElixir: 10, elixirRegen: 0.02,
    fireRate: 400, lastShot: 0, bulletDmg: 1, multiShot: 1
};

let bullets = [];
let enemies = [];

// --- INPUT (Mobil + PC) ---
function move(e) {
    let rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.x = (clientX - rect.left) * (canvas.width / rect.width) - player.w / 2;
    
    // Hold spilleren innenfor skjermen
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
}

canvas.addEventListener('touchmove', (e) => { move(e); e.preventDefault(); }, {passive: false});
canvas.addEventListener('mousemove', move);

// --- OPPGRADERINGER ---
const cards = [
    { n: "Double", d: "2x kuler", f: () => player.multiShot++ },
    { n: "Quick", d: "Raskere skudd", f: () => player.fireRate *= 0.8 },
    { n: "Pump", d: "Eliksir +", f: () => player.elixirRegen *= 1.3 },
    { n: "Power", d: "Skade +1", f: () => player.bulletDmg++ }
];

function spawnWave() {
    for(let i=0; i < 5 + wave; i++) {
        enemies.push({
            x: Math.random() * (canvas.width - 30),
            y: -Math.random() * 400,
            hp: 1 + Math.floor(wave/2),
            speed: 1.5 + (wave * 0.1),
            w: 30, h: 30
        });
    }
}

function showShop() {
    gameState = "SHOP";
    const shop = document.getElementById("shop");
    const container = document.getElementById("cards");
    shop.style.display = "flex";
    container.innerHTML = "";
    
    [...cards].sort(() => 0.5 - Math.random()).slice(0, 3).forEach(c => {
        let div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `<b>${c.n}</b><p>${c.d}</p>`;
        div.onclick = () => {
            c.f();
            shop.style.display = "none";
            wave++;
            document.getElementById("wave-val").innerText = wave;
            spawnWave();
            gameState = "PLAYING";
        };
        container.appendChild(div);
    });
}

function update() {
    if(gameState !== "PLAYING") return;

    // Elixir logic
    if(player.elixir < player.maxElixir) player.elixir += player.elixirRegen;
    document.getElementById("elixir-bar").style.width = (player.elixir / player.maxElixir * 100) + "%";

    // Auto-fire
    let now = Date.now();
    if(now - player.lastShot > player.fireRate) {
        for(let i=0; i<player.multiShot; i++) {
            bullets.push({x: player.x + 20 + (i*10 - 5), y: player.y, s: 8});
        }
        player.lastShot = now;
    }

    bullets.forEach((b, i) => { b.y -= b.s; if(b.y < 0) bullets.splice(i, 1); });

    enemies.forEach((en, ei) => {
        en.y += en.speed;
        bullets.forEach((b, bi) => {
            if(b.x > en.x && b.x < en.x + en.w && b.y < en.y + en.h) {
                en.hp -= player.bulletDmg;
                bullets.splice(bi, 1);
                if(en.hp <= 0) enemies.splice(ei, 1);
            }
        });
        if(en.y > canvas.height) {
            enemies.splice(ei, 1);
            player.hp--;
            if(player.hp <= 0) { alert("Game Over! Bølge: " + wave); location.reload(); }
        }
    });

    if(enemies.length === 0) showShop();
}

function draw() {
    ctx.fillStyle = "rgba(0,0,0,0.3)"; // Motion blur effekt
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#0ff";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    ctx.fillStyle = "#ff0";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

    ctx.fillStyle = "#f00";
    enemies.forEach(en => ctx.fillRect(en.x, en.y, en.w, en.h));

    requestAnimationFrame(() => { update(); draw(); });
}

spawnWave();
draw();
