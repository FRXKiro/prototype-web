const API = window.API_BASE_URL;

/* ---------------- Roster ---------------- */

async function loadRoster() {
  const status = document.getElementById("rosterStatus");
  const grid = document.getElementById("rosterGrid");
  try {
    const res = await fetch(`${API}/roster`);
    const data = await res.json();
    if (!data.users || data.users.length === 0) {
      status.textContent = "No agents on file yet. Be the first to join the Watch.";
      return;
    }
    status.textContent = `${data.users.length} agent(s) currently on watch.`;
    grid.innerHTML = data.users
      .map(
        (u) => `
        <div class="agent-card">
          <div class="agent-codename">${escapeHtml(u.codename)}</div>
          <div class="agent-specialty">${escapeHtml(u.specialty)}</div>
          <div class="agent-meter"><div class="agent-meter-fill" style="width:${u.believeScore}%"></div></div>
          <div class="agent-meter-label">${u.believeScore}% belief</div>
        </div>`
      )
      .join("");
  } catch (err) {
    status.textContent = "Couldn't reach HQ's server. Is the backend awake? (Render free tier naps after inactivity.)";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- Auth tabs ---------------- */

const tabBtns = document.querySelectorAll(".tab-btn");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.tab === "login") {
      loginForm.classList.remove("hidden");
      registerForm.classList.add("hidden");
    } else {
      registerForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    }
  });
});

/* ---------------- Login ---------------- */

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  const formData = new FormData(loginForm);
  const body = Object.fromEntries(formData.entries());

  msg.textContent = "Verifying credentials…";
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || "Login failed.";
      loginForm.classList.add("shake");
      setTimeout(() => loginForm.classList.remove("shake"), 400);
      return;
    }
    onAuthSuccess(data.token, data.user);
  } catch (err) {
    msg.textContent = "Couldn't reach HQ's server. Is the backend awake?";
  }
});

/* ---------------- Register ---------------- */

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("registerMsg");
  const formData = new FormData(registerForm);
  const body = Object.fromEntries(formData.entries());

  msg.textContent = "Filing your paperwork…";
  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.message || "Registration failed.";
      return;
    }
    onAuthSuccess(data.token, data.user);
    loadRoster();
  } catch (err) {
    msg.textContent = "Couldn't reach HQ's server. Is the backend awake?";
  }
});

/* ---------------- Session ---------------- */

function onAuthSuccess(token, user) {
  localStorage.setItem("cw_token", token);
  showDashboard(user);
}

function showDashboard(user) {
  document.getElementById("access").classList.add("hidden");
  const dash = document.getElementById("dashboard");
  dash.classList.remove("hidden");
  document.getElementById("dashGreeting").textContent = `Welcome back, ${user.codename}.`;
  document.getElementById("dashSpecialty").textContent = `Field specialty: ${user.specialty}`;
  updateBelieveDisplay(user.believeScore);
  dash.scrollIntoView({ behavior: "smooth" });
}

function updateBelieveDisplay(score) {
  document.getElementById("believeFill").style.width = `${score}%`;
  document.getElementById("believeValue").textContent = `${score}%`;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("cw_token");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("access").classList.remove("hidden");
});

const BELIEVE_LINES = [
  "Your aunt just texted \"I told you so.\"",
  "A distant howl agrees with you.",
  "The tinfoil in your hat just got 3% shinier.",
  "Somewhere, a trail camera fogs up mysteriously.",
  "You've unlocked a slightly blurrier photo."
];

document.getElementById("believeBtn").addEventListener("click", async () => {
  const token = localStorage.getItem("cw_token");
  const toast = document.getElementById("believeToast");
  if (!token) return;
  try {
    const res = await fetch(`${API}/auth/believe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      updateBelieveDisplay(data.believeScore);
      toast.textContent = BELIEVE_LINES[Math.floor(Math.random() * BELIEVE_LINES.length)];
    } else {
      toast.textContent = data.message || "Something went wrong.";
    }
  } catch (err) {
    toast.textContent = "Couldn't reach HQ's server.";
  }
});

// Resume session if a token is already saved
(async function resumeSession() {
  const token = localStorage.getItem("cw_token");
  if (!token) return;
  try {
    const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      showDashboard(data.user);
    } else {
      localStorage.removeItem("cw_token");
    }
  } catch (err) {
    /* backend probably asleep - fail quietly */
  }
})();

loadRoster();

/* ================= Easter eggs ================= */

// 1) Click the logo 5 times fast -> footprints + "BIGFOOT WAS HERE" banner
let logoClicks = 0;
let logoClickTimer = null;
document.getElementById("logoBtn").addEventListener("click", () => {
  logoClicks += 1;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => (logoClicks = 0), 1500);

  if (logoClicks >= 5) {
    logoClicks = 0;
    triggerBigfootMode();
  }
});

function triggerBigfootMode() {
  const banner = document.getElementById("bigfoot-banner");
  banner.classList.remove("show");
  void banner.offsetWidth; // restart animation
  banner.classList.add("show");

  const trail = document.getElementById("footprint-trail");
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    setTimeout(() => {
      const print = document.createElement("div");
      print.className = "footprint";
      print.textContent = i % 2 === 0 ? "🦶" : "🦶";
      print.style.left = `${10 + i * (80 / steps) + (Math.random() * 6 - 3)}%`;
      print.style.top = `${60 + Math.sin(i) * 15}%`;
      print.style.transform = i % 2 === 0 ? "scaleX(1)" : "scaleX(-1)";
      trail.appendChild(print);
      setTimeout(() => print.remove(), 2500);
    }, i * 120);
  }
}

// 2) Hidden "do not press" button -> conspiracy board modal + confetti
const conspiracyModal = document.getElementById("conspiracyModal");
const conspiracyText = document.getElementById("conspiracyText");

const CONSPIRACY_FRAGMENTS = [
  "the office printer", "Mercury retrograde", "a suspicious squirrel", "your neighbor's WiFi",
  "the moon landing (it's real, but still)", "a 24-hour diner in 1998", "static on channel 4",
  "a guy named Gary who saw something once", "expired yogurt", "the group chat"
];

function generateConspiracy() {
  const shuffled = [...CONSPIRACY_FRAGMENTS].sort(() => Math.random() - 0.5).slice(0, 4);
  return `${shuffled[0]} is connected to ${shuffled[1]}, which explains ${shuffled[2]} — and honestly, so does ${shuffled[3]}.`;
}

document.getElementById("secretBtn").addEventListener("click", () => {
  conspiracyText.textContent = generateConspiracy();
  conspiracyModal.classList.remove("hidden");
  launchConfetti();
});

document.getElementById("regenBtn").addEventListener("click", () => {
  conspiracyText.textContent = generateConspiracy();
  launchConfetti();
});

document.getElementById("closeModal").addEventListener("click", () => {
  conspiracyModal.classList.add("hidden");
});

function launchConfetti() {
  const layer = document.getElementById("confetti-layer");
  const emojis = ["🧻", "🛸", "🦶", "👽", "🌲", "🔦"];
  for (let i = 0; i < 24; i++) {
    const piece = document.createElement("div");
    piece.className = "confetto";
    piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDuration = `${2 + Math.random() * 2}s`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}
