const SUPABASE_URL = "https://onejynhbuesebccwssuz.supabase.co";
const SUPABASE_KEY = "sb_publishable_fuNq9rUAf_spgYttzXsJHg_C8NOggf2";
const LUDUS_URL = "https://crhstheatre.ludus.com/";
const SESSION_KEY = "crhs-fundraiser-session";
const app = document.querySelector("#app");
const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

async function request(path, options = {}, authenticated = false) {
  const session = getSession();
  const response = await fetch(`${SUPABASE_URL}/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
      ...(authenticated && session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(problem.msg || problem.message || problem.error_description || "Something went wrong");
  }
  if (response.status === 204) return null;
  return response.json();
}

function getSession() {
  const value = localStorage.getItem(SESSION_KEY);
  return value ? JSON.parse(value) : null;
}

async function loadPeople() {
  const [people, days] = await Promise.all([
    request("rest/v1/participants?select=id,slug,name,initials,color,raised,goal&active=eq.true&order=display_order"),
    request("rest/v1/sponsored_days?select=participant_id,day&paid=eq.true"),
  ]);
  return people.map((person) => ({
    ...person,
    sponsored: days.filter((item) => item.participant_id === person.id).map((item) => item.day),
  }));
}

function header() {
  return `<header class="topbar">
    <a class="brand" href="#/"><span class="mark">CR</span><span>Catawba Ridge Theatre</span></a>
    <nav><a href="#/">All calendars</a><a class="pill" href="#/login">Calendar owner login</a></nav>
  </header>`;
}

function footer() {
  return `<footer><b>Catawba Ridge Theatre</b><em>Small days. Big difference.</em><span>April Calendar Fundraiser · 2027</span></footer>`;
}

function calendarGrid(person, managing = false) {
  const blanks = "<span></span>".repeat(4);
  const days = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const paid = person.sponsored.includes(day);
    return `<button data-day="${day}" class="${paid ? "sponsored" : ""}" ${!managing && paid ? "disabled" : ""}>
      <b>${day}</b><small>${paid ? "♥ Sponsored" : `$${day}`}</small>
    </button>`;
  }).join("");
  return `<div class="calendar">
    <div class="month"><span></span><h2>April <em>2027</em></h2><span></span></div>
    <div class="weekdays">${weekdays.map((day) => `<span>${day}</span>`).join("")}</div>
    <div class="days">${blanks}${days}</div>
  </div>`;
}

async function home() {
  app.innerHTML = `${header()}<main><section class="hero">
    <div><p class="eyebrow">CATAWBA RIDGE THEATRE PRESENTS</p><h1>Every day can<br>make a <em>difference.</em></h1>
    <p class="lead">Choose a participant, sponsor an open April date, and complete the donation securely through the official theatre payment page.</p>
    <a class="button" href="#fundraisers">Choose a fundraiser →</a></div>
    <div class="hero-card"><span>APRIL</span><strong>30</strong><em>days to make a difference</em></div>
  </section><section id="fundraisers" class="fundraisers"><p class="eyebrow">OUR FUNDRAISERS</p><h2>Who will you support?</h2><div class="cards" id="cards"><p>Loading calendars…</p></div></section></main>${footer()}`;
  try {
    const people = await loadPeople();
    document.querySelector("#cards").innerHTML = people.map((person) => {
      const percent = Math.min(100, Math.round(person.raised / person.goal * 100));
      return `<a class="person" href="#/calendar/${person.slug}">
        <span class="avatar" style="background:${person.color}">${person.initials}</span>
        <span class="details"><b>${person.name}</b><i><span style="width:${percent}%"></span></i><small>$${person.raised} of $${person.goal} raised</small></span><strong>↗</strong>
      </a>`;
    }).join("");
  } catch (error) {
    document.querySelector("#cards").innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function personalCalendar(slug) {
  app.innerHTML = `${header()}<main class="personal"><p>Loading calendar…</p></main>${footer()}`;
  try {
    const people = await loadPeople();
    const person = people.find((item) => item.slug === slug);
    if (!person) throw new Error("That calendar could not be found.");
    app.innerHTML = `${header()}<main class="personal">
      <section><a href="#/">← All fundraisers</a><p class="eyebrow">APRIL CALENDAR FUNDRAISER</p><h1>Support<br><em>${person.name}</em></h1>
      <p class="lead">Choose an open date. The date is the donation amount, and payment is completed on Catawba Ridge Theatre’s Ludus page.</p>
      <p class="total"><b>$${person.raised}</b> raised of $${person.goal}</p></section>
      <section>${calendarGrid(person)}<div id="payment-note"></div></section>
    </main>${footer()}`;
    document.querySelectorAll(".days button:not(:disabled)").forEach((button) => {
      button.addEventListener("click", () => {
        const day = Number(button.dataset.day);
        document.querySelector("#payment-note").innerHTML = `<div class="notice">Day ${day} selected · Complete the $${day} donation on Ludus. <a href="${LUDUS_URL}" target="_blank" rel="noreferrer">Open payment page →</a></div>`;
        window.open(LUDUS_URL, "_blank", "noopener,noreferrer");
      });
    });
  } catch (error) {
    document.querySelector(".personal").innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function login() {
  if (getSession()) return dashboard();
  app.innerHTML = `<main class="auth"><a class="brand" href="#/"><span class="mark">CR</span><span>Catawba Ridge Theatre</span></a>
    <section class="auth-card"><p class="eyebrow" id="auth-label">CALENDAR OWNERS</p><h1 id="auth-title">Welcome<br><em>back.</em></h1>
    <p id="auth-copy">Sign in with the email and password connected to your fundraiser.</p>
    <form id="auth-form"><label>Email<input id="email" type="email" required></label><label>Password<input id="password" type="password" minlength="8" required></label>
    <p id="auth-message"></p><button class="button" type="submit">Sign in securely</button></form>
    <button class="link-button" id="switch-auth">New participant? Create an account</button><a href="#/">← Return to all calendars</a></section></main>`;
  let creating = false;
  const switchButton = document.querySelector("#switch-auth");
  switchButton.addEventListener("click", () => {
    creating = !creating;
    document.querySelector("#auth-label").textContent = creating ? "JOIN THE FUNDRAISER" : "CALENDAR OWNERS";
    document.querySelector("#auth-title").innerHTML = creating ? "Create your<br><em>account.</em>" : "Welcome<br><em>back.</em>";
    document.querySelector("#auth-copy").textContent = creating ? "Create an account, then enter your own name to receive a personal April calendar." : "Sign in with the email and password connected to your fundraiser.";
    document.querySelector("#auth-form .button").textContent = creating ? "Create my account" : "Sign in securely";
    switchButton.textContent = creating ? "Already have an account? Sign in" : "New participant? Create an account";
    document.querySelector("#auth-message").textContent = "";
  });
  document.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.querySelector("#auth-message");
    message.textContent = "Please wait…";
    try {
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;
      const data = await request(creating ? "auth/v1/signup" : "auth/v1/token?grant_type=password", {
        method: "POST", body: JSON.stringify({ email, password }),
      });
      if (data.access_token) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data));
        location.hash = "#/dashboard";
      } else {
        message.className = "success";
        message.textContent = "Account created! Check your email to confirm it, then return here to sign in.";
        creating = false;
      }
    } catch (error) {
      message.className = "error";
      message.textContent = error.message;
    }
  });
}

async function dashboard() {
  const session = getSession();
  if (!session) return login();
  app.innerHTML = `${header()}<main class="dashboard"><div class="dash-head"><div><p class="eyebrow">YOUR CALENDAR DASHBOARD</p><h1>Your April<br><em>calendar.</em></h1></div><button class="pill" id="signout">Sign out</button></div><div id="dashboard-content"><p>Loading…</p></div></main>`;
  document.querySelector("#signout").addEventListener("click", async () => {
    await request("auth/v1/logout", { method: "POST" }, true).catch(() => {});
    localStorage.removeItem(SESSION_KEY);
    location.hash = "#/";
  });
  try {
    const calendars = await request(`rest/v1/participants?select=id,slug,name,initials,raised,goal&owner_id=eq.${session.user.id}`, {}, true);
    if (!calendars[0]) {
      document.querySelector("#dashboard-content").innerHTML = `<section class="setup"><h2>Create your calendar</h2><form id="name-form"><label>Your full name<input id="name" required></label><p id="setup-message"></p><button class="button">Create my calendar</button></form></section>`;
      document.querySelector("#name-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.querySelector("#name").value.trim();
        const initials = name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
        const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${session.user.id.slice(0, 6)}`;
        try {
          await request("rest/v1/participants", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ owner_id: session.user.id, name, slug, initials, color: "#123d2c", goal: 465, raised: 0 }) }, true);
          dashboard();
        } catch (error) {
          document.querySelector("#setup-message").textContent = error.message;
        }
      });
      return;
    }
    const person = calendars[0];
    const paidDays = await request(`rest/v1/sponsored_days?select=day&participant_id=eq.${person.id}&paid=eq.true`, {}, true);
    person.sponsored = paidDays.map((item) => item.day);
    document.querySelector("#dashboard-content").innerHTML = `<div class="dashboard-actions"><a class="button" href="#/calendar/${person.slug}">View public calendar →</a><p>Click a day after its Ludus payment is confirmed. Click it again to reopen the day.</p></div>${calendarGrid(person, true)}<p id="dash-message"></p>`;
    document.querySelectorAll(".days button").forEach((button) => button.addEventListener("click", async () => {
      const day = Number(button.dataset.day);
      const paid = person.sponsored.includes(day);
      try {
        if (paid) {
          await request(`rest/v1/sponsored_days?participant_id=eq.${person.id}&day=eq.${day}`, { method: "DELETE" }, true);
          person.sponsored = person.sponsored.filter((item) => item !== day);
        } else {
          await request("rest/v1/sponsored_days", { method: "POST", body: JSON.stringify({ participant_id: person.id, day, amount: day, paid: true }) }, true);
          person.sponsored.push(day);
        }
        dashboard();
      } catch (error) {
        document.querySelector("#dash-message").textContent = error.message;
      }
    }));
  } catch (error) {
    document.querySelector("#dashboard-content").innerHTML = `<p class="error">${error.message}</p>`;
  }
}

function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  if (path.startsWith("/calendar/")) return personalCalendar(path.split("/")[2]);
  if (path === "/login") return login();
  if (path === "/dashboard") return dashboard();
  return home();
}

window.addEventListener("hashchange", route);
route();
