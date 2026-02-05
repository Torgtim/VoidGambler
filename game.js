const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Konfigurasjon
canvas.width = 400; 
canvas.height = 600;

let gameState = "PLAYING"; 
let wave = 1;
let credits = 0;

let player = {
    x: 180, y: 520, w: 40, h: 40,
    hp: 3, maxHp: 3,
    elixir: 0, maxElixir: 10, elixirRegen: 0.02,
    fireRate: 450, lastShot: 0, 
    bulletDmg: 1, bulletSize: 4, multiShot: 1,
    vampire: 0, pierce: false, passiveIncome: 0
};

let bullets = [];
let enemies = [];

// --- KONTROLLER (Touch + Mus) ---
function handleInput(e) {
    if(gameState !== "PLAYING") return;
    let rect = canvas.getBoundingClientRect();
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.x = (clientX - rect.left) * (canvas.width / rect.width) - player.w / 2;
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
}
canvas.addEventListener('touchmove', (e) => { handleInput(e); e.preventDefault(); }, {passive: false});
canvas.addEventListener('mousemove', handleInput);

// --- KORT / OPPGRADERINGER ---
const cardPool = [
    { n: "DOUBLE TAP", d: "+1 kule per skudd", f: () => player.multiShot++ },
    { n: "OVERCLOCK", d: "Mye raskere skyting, -1 HP", f: () => { player.fireRate *= 0.6; player.hp--; } },
    { n: "VAMPIRE", d: "Sjanse for HP ved kill", f: () => player.vampire += 0.1 },
    { n: "BIG BERTHA", d: "Store kuler, +2 skade", f: () => { player.bulletSize += 4; player.bulletDmg += 2; } },
    { n: "PIERCE", d: "Kuler går gjennom fiender", f: () => player.pierce = true },
    { n: "INTEREST", d: "Få +20 credits per bølge", f: () => player.passiveIncome += 20 },
    { n: "REPAIR", d: "Gjenopprett full helse", f: () => player.hp = player.maxHp },
    { n: "PUMP", d: "Raskere Elixir-lading", f: () => player.elixirRegen *= 1.4 }
];

function spawnWave() {
    let enemyCount = 5 + Math.floor(wave * 1.5);
    
    // Boss hver 5. bølge
    if (wave % 5 === 0) {
        enemies.push({
            x: 150, y: -100, w: 100, h: 80, hp: 20 + (wave * 5),
            speed: 0.5, color: "#f0f", isBoss: true
        });
        enemyCount = Math.floor(enemyCount / 2);
    }

    for(let i=0; i < enemyCount; i++) {
        let r = Math.random();
        let en = { x: Math.random() * (canvas.width - 30), y: -Math.random() * 500, w: 30, h: 30, color: "#f00", hp: 1 + Math.floor(wave/3), speed: 1.5 + (wave * 0.1) };
        
        if(r > 0.8) { // Tank
            en.w = 50; en.h = 50; en.hp *= 4; en.speed *= 0.5; en.color = "#5500ff";
        } else if(r > 0.6) { // Speedster
            en.w = 20; en.h = 20; en.speed *= 2; en.color = "#ff0";
        }
        enemies.push(en);
    }
}

function showShop() {
    gameState = "SHOP";
    document.getElementById("shop").style.display = "flex";
    const container = document.getElementById("cards");
    container.innerHTML = "";
    
    // Passiv inntekt fra kort
    credits += player.passiveIncome;
    document.getElementById("credit-val").innerText = credits;

    [...cardPool].sort(() => 0.5 - Math.random()).slice(0, 3).forEach(c => {
        let d = document.createElement("div");
        d.className = "card";
        d.innerHTML = `<h3>${c.n}</h3><p>${c.d}</p>`;
        d.onclick = () => {
            c.f();
            document.getElementById("shop").style.display = "none";
            wave++;
            document.getElementById("wave-val").innerText = wave;
            document.getElementById("hp-val").innerText = player.hp;
            spawnWave();
            gameState = "PLAYING";
        };
        container.appendChild(d);
    });
}

function gameOver() {
    gameState = "GAMEOVER";
    document.getElementById("game-over").style.display = "flex";
    document.getElementById("final-stats").innerText = `WAVE: ${wave} | CREDITS: ${credits}`;
}

function update() {
    if(gameState !== "PLAYING") return;

    // Elixir
    if(player.elixir < player.maxElixir) player.elixir += player.elixirRegen;
    document.getElementById("elixir-bar").style.width = (player.elixir / player.maxElixir * 100) + "%";

    // Auto-skyting (basert på fireRate)
    let now = Date.now();
    if(now - player.lastShot > player.fireRate) {
        for(let i=0; i<player.multiShot; i++) {
            bullets.push({x: player.x + (player.w/2) - (player.bulletSize/2) + (i*12 - (player.multiShot-1)*6), y: player.y, s: 8});
        }
        player.lastShot = now;
    }

    bullets.forEach((b, i) => { b.y -= b.s; if(b.y < -20) bullets.splice(i, 1); });

    enemies.forEach((en, ei) => {
        en.y += en.speed;
        
        // Sjekk kollisjon med kuler
        bullets.forEach((b, bi) => {
            if(b.x < en.x + en.w && b.x + player.bulletSize > en.x && b.y < en.y + en.h) {
                en.hp -= player.bulletDmg;
                if(!player.pierce) bullets.splice(bi, 1);
                if(en.hp <= 0) {
                    if(Math.random() < player.vampire) { player.hp++; document.getElementById("hp-val").innerText = player.hp; }
                    enemies.splice(ei, 1);
                    credits += 10;
                    document.getElementById("credit-val").innerText = credits;
                }
            }
        });

        // Sjekk kollisjon med spiller eller bunnen
        if(en.y > canvas.height || (en.x < player.x + player.w && en.x + en.w > player.x && en.y + en.h > player.y)) {
            enemies.splice(ei, 1);
            player.hp--;
            document.getElementById("hp-val").innerText = player.hp;
            if(player.hp <= 0) gameOver();
        }
    });

    if(enemies.length === 0) showShop();
}

function draw() {
    ctx.fillStyle = "rgba(0,0,0,0.2)"; // Motion blur
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Spiller (Neon boks)
    ctx.shadowBlur = 15; ctx.shadowColor = "#0ff";
    ctx.fillStyle = "#0ff";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Kuler
    ctx.shadowColor = "#ff0";
    ctx.fillStyle = "#ff0";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, player.bulletSize, player.bulletSize * 2));

    // Fiender
    enemies.forEach(en => {
        ctx.shadowColor = en.color;
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x, en.y, en.w, en.h);
    });

    ctx.shadowBlur = 0;
    requestAnimationFrame(() => { update(); draw(); });
}

spawnWave();
draw();
