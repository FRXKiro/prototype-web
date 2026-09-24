const API = window.API_BASE_URL;
let currentBelieve = 0;

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
        <div class="agent-card${isBigfoot(u.codename) ? " golden" : ""}">
          <div class="agent-codename">${escapeHtml(u.codename)}${u.believeScore >= 100 ? ' <span class="agent-badge" title="Cryptid Tier: Unhinged">🛸</span>' : ""}</div>
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

let loginFailCount = 0;

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

      loginFailCount += 1;
      if (loginFailCount === 3) {
        showWantedPoster();
      }
      if (loginFailCount >= 5) {
        showCaptchaGate();
      }
      return;
    }
    loginFailCount = 0;
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
  document.getElementById("dashBigfoot").classList.toggle("hidden", !isBigfoot(user.codename));
  updateBelieveDisplay(user.believeScore);
  dash.scrollIntoView({ behavior: "smooth" });
}

function updateBelieveDisplay(score) {
  currentBelieve = score;
  document.getElementById("dashBadge").classList.toggle("hidden", score < 100);
  document.getElementById("believeFill").style.width = `${score}%`;
  document.getElementById("believeValue").textContent = `${score}%`;
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  logoutClickCount += 1;
  clearTimeout(logoutClickResetTimer);
  logoutClickResetTimer = setTimeout(() => (logoutClickCount = 0), 700);

  if (logoutClickCount >= 3) {
    logoutClickCount = 0;
    clearTimeout(logoutActionTimer);
    showLogoutModal();
    return;
  }

  clearTimeout(logoutActionTimer);
  logoutActionTimer = setTimeout(performLogout, 350);
});

function performLogout() {
  localStorage.removeItem("cw_token");
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("access").classList.remove("hidden");
}

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
  if (currentBelieve >= 100) {
    toast.textContent = "You have already ascended. There is no higher plane. (We checked.)";
    return;
  }
  try {
    const res = await fetch(`${API}/auth/believe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      const prev = currentBelieve;
      updateBelieveDisplay(data.believeScore);
      if (prev < 100 && data.believeScore >= 100) {
        toast.textContent = "";
        triggerAscension();
        loadRoster(); // refresh so the new badge shows up
      } else {
        toast.textContent = BELIEVE_LINES[Math.floor(Math.random() * BELIEVE_LINES.length)];
      }
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
//    (Hold the logo for 3s instead -> summon attempt. Double-click -> signal glitch.)
let logoClicks = 0;
let logoClickTimer = null;
let logoLongPressTimer = null;
let logoLongPressFired = false;

const logoBtn = document.getElementById("logoBtn");

logoBtn.addEventListener("pointerdown", () => {
  logoLongPressFired = false;
  logoLongPressTimer = setTimeout(() => {
    logoLongPressFired = true;
    triggerLogoSummon();
  }, 3000);
});

["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
  logoBtn.addEventListener(evt, () => clearTimeout(logoLongPressTimer));
});

logoBtn.addEventListener("click", () => {
  if (logoLongPressFired) {
    logoLongPressFired = false;
    return; // the long press already did its thing, don't also count this as a click
  }
  logoClicks += 1;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => (logoClicks = 0), 1500);

  if (logoClicks >= 5) {
    logoClicks = 0;
    triggerBigfootMode();
  }
});

logoBtn.addEventListener("dblclick", () => {
  glitchBrandText();
});

function glitchBrandText() {
  const el = document.getElementById("brandText");
  const original = "Cryptid Watch Society";
  const glitchChars = "#%&$?!*/\\<>01";
  let ticks = 0;
  const interval = setInterval(() => {
    ticks += 1;
    el.textContent = original
      .split("")
      .map((ch) => (ch === " " ? " " : Math.random() < 0.4 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : ch))
      .join("");
    if (ticks >= 6) {
      clearInterval(interval);
      el.textContent = original;
    }
  }, 70);
}

function triggerLogoSummon() {
  const layer = document.getElementById("logoSummon");
  layer.innerHTML = "";

  const wave = document.createElement("div");
  wave.className = "summon-wave";
  wave.innerHTML =
    '<svg width="120" height="30" viewBox="0 0 120 30"><path d="M0 15 Q10 0 20 15 T40 15 T60 15 T80 15 T100 15 T120 15" fill="none" stroke="#f2b134" stroke-width="2"/></svg>';
  layer.appendChild(wave);

  const words = ["AWOOOGA?", "HOOOWL?", "...anyone?"];
  words.forEach((word, i) => {
    setTimeout(() => {
      const span = document.createElement("div");
      span.className = "summon-word";
      span.textContent = word;
      span.style.top = `${i * 4}px`;
      layer.appendChild(span);
      setTimeout(() => span.remove(), 1900);
    }, i * 350);
  });

  const fizzle = document.createElement("div");
  fizzle.className = "summon-fizzle";
  fizzle.textContent = "nothing happened. try again?";
  layer.appendChild(fizzle);
  setTimeout(() => fizzle.remove(), 3200);
}

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

// 2) Hidden "do not press" button -> cycles through excuses, then gives up
//    and shows the conspiracy board modal + confetti
const conspiracyModal = document.getElementById("conspiracyModal");
const conspiracyText = document.getElementById("conspiracyText");
const secretBtn = document.getElementById("secretBtn");

const SECRET_STAGES = ["do not press", "seriously, don't", "ok maybe just a peek?", "we both know you're going to"];
let secretStage = 0;

function handleSecretBtnClick() {
  secretStage += 1;
  if (secretStage < SECRET_STAGES.length) {
    secretBtn.textContent = SECRET_STAGES[secretStage];
    return;
  }
  // gave in - reveal the conspiracy board
  secretStage = 0;
  secretBtn.textContent = SECRET_STAGES[0];
  conspiracyText.textContent = generateConspiracy();
  conspiracyModal.classList.remove("hidden");
  launchConfetti();
}

const CONSPIRACY_FRAGMENTS = [
  "the office printer", "Mercury retrograde", "a suspicious squirrel", "your neighbor's WiFi",
  "the moon landing (it's real, but still)", "a 24-hour diner in 1998", "static on channel 4",
  "a guy named Gary who saw something once", "expired yogurt", "the group chat"
];

function generateConspiracy() {
  const shuffled = [...CONSPIRACY_FRAGMENTS].sort(() => Math.random() - 0.5).slice(0, 4);
  return `${shuffled[0]} is connected to ${shuffled[1]}, which explains ${shuffled[2]} — and honestly, so does ${shuffled[3]}.`;
}

document.getElementById("secretBtn").addEventListener("click", handleSecretBtnClick);

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

// 3) Fail login 3x -> WANTED poster. Fail 5x -> dodgy "I am human" captcha.

function showWantedPoster() {
  const poster = document.getElementById("wantedPoster");
  poster.classList.remove("hidden");
  requestAnimationFrame(() => poster.classList.add("show"));
}

function hideWantedPoster() {
  const poster = document.getElementById("wantedPoster");
  poster.classList.remove("show");
  setTimeout(() => poster.classList.add("hidden"), 500);
}

document.getElementById("closeWanted").addEventListener("click", hideWantedPoster);

function showCaptchaGate() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("captchaGate").classList.remove("hidden");
  captchaDodgesLeft = 2;
  const btn = document.getElementById("captchaBtn");
  btn.style.top = "40px";
  btn.style.left = "50%";
  btn.style.transform = "translateX(-50%)";
  document.getElementById("captchaMsg").textContent = "";
}

let captchaDodgesLeft = 2;
const captchaBox = document.getElementById("captchaBox");
const captchaBtn = document.getElementById("captchaBtn");

captchaBtn.addEventListener("mouseenter", () => {
  if (captchaDodgesLeft > 0) {
    captchaDodgesLeft -= 1;
    const boxRect = captchaBox.getBoundingClientRect();
    const maxLeft = Math.max(boxRect.width - 140, 20);
    const maxTop = Math.max(boxRect.height - 44, 10);
    const newLeft = Math.floor(Math.random() * maxLeft) + 20;
    const newTop = Math.floor(Math.random() * maxTop);
    captchaBtn.style.left = `${newLeft}px`;
    captchaBtn.style.top = `${newTop}px`;
    captchaBtn.style.transform = "none";
  }
});

captchaBtn.addEventListener("click", () => {
  if (captchaDodgesLeft > 0) return; // shouldn't normally happen, but just in case
  document.getElementById("captchaMsg").textContent =
    "Fine. You've proven you're slower than a cryptid, which is the bar.";
  setTimeout(() => {
    loginFailCount = 0;
    document.getElementById("captchaGate").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
  }, 1600);
});

// 4) Triple-click "Log out" fast -> fake-dramatic confirmation modal
let logoutClickCount = 0;
let logoutClickResetTimer = null;
let logoutActionTimer = null;

function showLogoutModal() {
  document.getElementById("logoutModal").classList.remove("hidden");
}
function hideLogoutModal() {
  document.getElementById("logoutModal").classList.add("hidden");
}

document.getElementById("stayBtn").addEventListener("click", hideLogoutModal);
document.getElementById("leaveBtn").addEventListener("click", () => {
  hideLogoutModal();
  performLogout();
});

// 5) Konami code anywhere on the page -> full-screen ritual
const KONAMI_SEQUENCE = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright",
  "b", "a"
];
let konamiBuffer = [];
let konamiUsed = false;

document.addEventListener("keydown", (e) => {
  if (konamiUsed) return;
  konamiBuffer.push(e.key.toLowerCase());
  konamiBuffer = konamiBuffer.slice(-KONAMI_SEQUENCE.length);
  if (konamiBuffer.join(",") === KONAMI_SEQUENCE.join(",")) {
    konamiUsed = true;
    triggerKonamiRitual();
  }
});

function triggerKonamiRitual() {
  const overlay = document.getElementById("konamiOverlay");
  const footprintLayer = document.getElementById("konamiFootprints");
  const cooldown = document.getElementById("konamiCooldown");
  cooldown.textContent = "The ritual is now on cooldown for 24 hours (or until you press F5).";

  footprintLayer.innerHTML = "";
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const print = document.createElement("span");
    print.textContent = "🦶";
    print.style.left = `${(i / steps) * 100}%`;
    print.style.animationDelay = `${0.6 + i * 0.1}s`;
    print.style.transform = i % 2 === 0 ? "scaleX(1)" : "scaleX(-1)";
    footprintLayer.appendChild(print);
  }

  overlay.classList.remove("hidden");
  requestAnimationFrame(() => overlay.classList.add("show"));
  setTimeout(() => overlay.classList.add("hidden"), 5600);
}

// 6) Idle 60s with no activity -> gentle nudge toast
let lastActivity = Date.now();
let idleToastShown = false;

["click", "scroll", "keydown", "touchstart"].forEach((evt) => {
  document.addEventListener(evt, () => {
    lastActivity = Date.now();
    idleToastShown = false;
  });
});

setInterval(() => {
  if (!idleToastShown && Date.now() - lastActivity > 60000) {
    idleToastShown = true;
    const toast = document.getElementById("idleToast");
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.classList.add("hidden"), 400);
    }, 5000);
  }
}, 5000);

// 7) Visit after midnight -> swap the hero headline
(function checkLateNight() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) {
    const headline = document.getElementById("heroHeadline");
    if (headline) {
      headline.innerHTML = "Field agents shouldn't be up this late.<br>Neither should we, honestly.";
    }
  }
})();


/* ================= Easter eggs, round 2 ================= */

function isBigfoot(name) {
  return /bigfoot/i.test(name || "");
}

function mk(cls, text) {
  const el = document.createElement("div");
  el.className = cls;
  el.setAttribute("aria-hidden", "true");
  if (text) el.textContent = text;
  document.body.appendChild(el);
  return el;
}

function replay(el, cls, ms) {
  el.classList.remove(cls);
  void el.offsetWidth; // restart the animation
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

// 8) "bigfoot" in a codename -> golden sparkly roster card + welcome line
//    (handled in loadRoster() and showDashboard() via isBigfoot)

// 9) Hit 100% on the belief meter -> white flash, UFO, ascension message, permanent badge
//    (the badge is just "believeScore >= 100" on the roster, so it never goes away)
const flashEl = mk("flash-overlay");
const ufoEl = mk("ufo", "🛸");
const ascendEl = mk("ascend-msg", "You have ascended to Cryptid Tier: Unhinged.");

function triggerAscension() {
  replay(flashEl, "show", 1000);
  replay(ufoEl, "fly", 3200);
  replay(ascendEl, "show", 5400);
}

// 10) Keep scrolling past the footer -> terrible trail-cam photo
let mothShown = false;
let overscroll = 0;
let overscrollTimer = null;
let touchStartY = 0;
let touchStartedAtBottom = false;

function atPageBottom() {
  return Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 2;
}

function showMoth() {
  if (mothShown) return;
  mothShown = true;
  const sec = document.createElement("section");
  sec.className = "moth-section";
  sec.innerHTML =
    '<div class="moth-photo" role="img" aria-label="A blurry smudge"><div class="moth-trunk"></div><div class="moth-blob"></div><div class="moth-stamp">TRAILCAM 03:47 AM</div></div>' +
    '<p class="moth-caption">Definitely just a moth.</p>';
  document.querySelector(".site-footer").after(sec);
  sec.scrollIntoView({ behavior: "smooth", block: "end" });
}

window.addEventListener(
  "wheel",
  (e) => {
    if (mothShown || e.deltaY <= 0 || !atPageBottom()) {
      overscroll = 0;
      return;
    }
    overscroll += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
    clearTimeout(overscrollTimer);
    overscrollTimer = setTimeout(() => (overscroll = 0), 900);
    if (overscroll > 300) showMoth();
  },
  { passive: true }
);

window.addEventListener(
  "touchstart",
  (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartedAtBottom = atPageBottom();
  },
  { passive: true }
);

window.addEventListener(
  "touchmove",
  (e) => {
    if (touchStartedAtBottom && touchStartY - e.touches[0].clientY > 90) showMoth();
  },
  { passive: true }
);

// 11) Random favicon on every load (never the same one twice in a row)
(function randomFavicon() {
  const icons = ["🦶", "👽", "🐉", "🧊"];
  let last = -1;
  try {
    const stored = localStorage.getItem("cw_favicon");
    if (stored !== null) last = Number(stored);
  } catch (e) {}
  let pick;
  do {
    pick = Math.floor(Math.random() * icons.length);
  } while (pick === last);
  try {
    localStorage.setItem("cw_favicon", String(pick));
  } catch (e) {}

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icons[pick]}</text></svg>`;
  document.querySelectorAll('link[rel="icon"]').forEach((l) => l.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  document.head.appendChild(link);
})();

// 12) Type "yeti" anywhere -> icy filter + snowfall (ignores password fields)
const yetiTint = mk("yeti-tint");
const snowLayer = mk("snow-layer");
const yetiMsg = mk("yeti-msg", "YETI MODE: engaged. Everything is now 20% colder.");
let yetiBuffer = "";
let yetiActive = false;

document.addEventListener("keydown", (e) => {
  if (yetiActive || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  if (e.target && e.target.type === "password") return;
  yetiBuffer = (yetiBuffer + e.key.toLowerCase()).slice(-4);
  if (yetiBuffer === "yeti") {
    yetiBuffer = "";
    triggerYetiMode();
  }
});

function triggerYetiMode() {
  yetiActive = true;
  yetiTint.classList.add("on");
  yetiMsg.classList.add("show");

  const flakes = ["❄", "❅", "❆"];
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const f = document.createElement("div");
      f.className = "snowflake";
      f.textContent = flakes[i % 3];
      f.style.left = `${Math.random() * 100}%`;
      f.style.fontSize = `${0.8 + Math.random() * 1.2}rem`;
      f.style.setProperty("--drift", `${Math.random() * 80 - 40}px`);
      f.style.animationDuration = `${2.5 + Math.random() * 2}s`;
      snowLayer.appendChild(f);
      setTimeout(() => f.remove(), 4800);
    }, i * 90);
  }

  setTimeout(() => yetiMsg.classList.remove("show"), 5000);
  setTimeout(() => {
    yetiTint.classList.remove("on");
    yetiActive = false;
  }, 7500);
}
