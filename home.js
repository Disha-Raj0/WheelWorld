// ── Filter switching ──────────────────────────────────────────
function showBudgetNew() {
  document.getElementById("budgetSection").style.display = "block";
  document.getElementById("brandSection").style.display  = "none";
}
function showBrand() {
  document.getElementById("budgetSection").style.display = "none";
  document.getElementById("brandSection").style.display  = "block";
}

// ── Brand → Model map ─────────────────────────────────────────
const brandModels = {
  "Maruti Suzuki": ["Swift","Dzire","Baleno","Brezza","Ertiga","Wagon R","Alto K10","Grand Vitara","FRONX","Jimny"],
  "Hyundai": ["Creta","i20","Venue","Verna","Tucson","Alcazar","Exter"],
  "Tata":    ["Nexon","Punch","Harrier","Safari","Altroz","Tiago","Tigor","Curvv"],
  "Honda":   ["City","Amaze","Elevate"],
  "Toyota":  ["Fortuner","Innova Crysta","Innova HyCross","Urban Cruiser Hyryder","Glanza"],
  "Kia":     ["Sonet","Seltos","Carens","EV6"],
  "MG":      ["Hector","Windsor EV","ZS EV","Astor","Gloster"],
  "Mahindra":["XUV700","Scorpio-N","Thar","Thar ROXX","XUV 3XO","BE 6"],
  "Volkswagen":["Taigun","Virtus"],
  "Skoda":   ["Kushaq","Slavia","Kylaq"],
};

function updateModels() {
  const brand  = document.getElementById("brandSelect").value;
  const select = document.getElementById("modelSelect");
  select.innerHTML = '<option value="">Select Model</option>';
  (brandModels[brand] || []).forEach(m => {
    const o = document.createElement("option");
    o.value = m; o.textContent = m;
    select.appendChild(o);
  });
}

// ── Search ────────────────────────────────────────────────────
async function searchCars() {
  const input         = document.getElementById("searchInput").value.trim();
  const selectedBudget= document.getElementById("newBudget").value;
  const selectedType  = document.getElementById("VehicleType").value;

  if (!input && !selectedBudget && !selectedType) {
    showToast("Please enter a search term or select a filter", "error");
    return;
  }

  const btn = document.querySelector(".search-btn");
  btn.textContent = "Searching...";
  btn.disabled    = true;

  try {
    const filters = {};
    if (input)          filters.search = input;
    if (selectedBudget) filters.budget = selectedBudget;
    if (selectedType)   filters.type   = selectedType;
    filters.limit = 50;

    const data = await Cars.getAll(filters);
    displayCars(data.cars || []);
    document.getElementById("resultsSection").style.display = "block";
    document.getElementById("resultsCount").textContent = data.total || data.cars.length;
    document.getElementById("resultsSection").scrollIntoView({ behavior:"smooth", block:"start" });
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search Cars`;
    btn.disabled = false;
  }
}

async function filterByType(type) {
  const filters = { limit: 50 };
  if (type === "Electric") {
    // handled by searching both
    const [ev, hybrid] = await Promise.all([
      Cars.getAll({ type: "Electric", limit: 30 }),
      Cars.getAll({ type: "Hybrid",   limit: 20 }),
    ]);
    const all = [...(ev.cars||[]), ...(hybrid.cars||[])];
    displayCars(all);
    document.getElementById("resultsCount").textContent = all.length;
  } else {
    filters.type = type;
    const data = await Cars.getAll(filters);
    displayCars(data.cars || []);
    document.getElementById("resultsCount").textContent = data.total || 0;
  }
  document.getElementById("resultsSection").style.display = "block";
  document.getElementById("resultsSection").scrollIntoView({ behavior:"smooth", block:"start" });
}

async function filterByBrand(brand) {
  try {
    const data = await Cars.getAll({ brand, limit: 50 });
    if (!data.cars || data.cars.length === 0) {
      showToast(`No cars found for ${brand}`, "error"); return;
    }
    displayCars(data.cars);
    document.getElementById("resultsCount").textContent = data.total || 0;
    document.getElementById("resultsSection").style.display = "block";
    document.getElementById("resultsSection").scrollIntoView({ behavior:"smooth", block:"start" });
  } catch (err) {
    showToast(err.message, "error");
  }
}

function clearResults() {
  document.getElementById("resultsSection").style.display = "none";
  document.getElementById("results").innerHTML = "";
}

// ── Display cars ──────────────────────────────────────────────
function displayCars(carList) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!carList || carList.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div>
        <h3>No cars found</h3>
        <p>Try adjusting your filters or search term.</p>
      </div>`;
    return;
  }

  carList.forEach(car => {
    const carId   = car._id || car.name;
    const isWished = wishedIds.has(carId);
    resultsDiv.innerHTML += buildCarCard(car, isWished);
  });
}

function buildCarCard(car, isWished = false) {
  const carId = car._id || car.name;
  return `
    <div class="car-card">
      <div class="car-card-img">
        <img src="${car.image}" alt="${car.name}" loading="lazy"
          onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
      </div>
      <div class="car-card-body">
        <h3>${car.name}</h3>
        <div class="car-card-price">${car.price || "Price on request"}</div>
        <div class="car-card-specs">
          ${car.mileage ? `<span class="spec-tag">⛽ ${car.mileage}</span>` : ""}
          ${car.fuel    ? `<span class="spec-tag">${car.fuel}</span>`      : ""}
          ${car.type && car.type !== "car" ? `<span class="spec-tag">${car.type}</span>` : ""}
        </div>
        <div class="car-card-actions">
          <button class="btn-view" onclick="viewDetails('${car._id || ""}', '${car.name}')">View Details</button>
          <button class="btn-wish ${isWished ? "active" : ""}"
            onclick="toggleWishlist('${carId}', '${car.name}', this)"
            title="Wishlist">${isWished ? "❤️" : "🤍"}</button>
        </div>
      </div>
    </div>`;
}

// ── Wishlist ──────────────────────────────────────────────────
let wishedIds = new Set();

async function loadWishlistIds() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await Wishlist.get();
    wishedIds  = new Set((data.cars || []).map(c => c._id || c));
  } catch { wishedIds = new Set(); }
}

async function toggleWishlist(carId, carName, btn) {
  if (!Auth.isLoggedIn()) {
    if (confirm("Please login to use Wishlist. Login now?")) window.location.href = "login.html";
    return;
  }

  try {
    if (wishedIds.has(carId)) {
      await Wishlist.remove(carId);
      wishedIds.delete(carId);
      btn.innerHTML = "🤍";
      btn.classList.remove("active");
      showToast("Removed from Wishlist");
    } else {
      await Wishlist.add(carId);
      wishedIds.add(carId);
      btn.innerHTML = "❤️";
      btn.classList.add("active");
      showToast("Added to Wishlist ❤️", "success");
    }
    updateWishlistBadge();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── View details ──────────────────────────────────────────────
function viewDetails(carId, carName) {
  // Prefer _id, fall back to name-based lookup
  if (carId) {
    window.location.href = `details.html?id=${carId}`;
  } else {
    window.location.href = `details.html?car=${encodeURIComponent(carName)}`;
  }
}

// ── Recommendations ───────────────────────────────────────────
async function loadRecommendations() {
  const div = document.getElementById("recommendationList");
  try {
    const data = await Cars.getFeatured();
    const cars  = data.cars || [];
    div.innerHTML = "";
    cars.forEach(car => {
      div.innerHTML += buildCarCard(car, wishedIds.has(car._id));
    });
  } catch (err) {
    // Fallback: load from local data.js if API fails
    if (typeof window.cars !== "undefined") {
      const local = window.cars.filter(c => c.budget && c.image).slice(0, 8);
      local.forEach(car => {
        div.innerHTML += buildCarCard(car, false);
      });
    }
  }
}

// ── Dark mode ─────────────────────────────────────────────────
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  document.querySelector(".dark-toggle").textContent = isDark ? "☀️" : "🌙";
}

// ── Search on Enter key ───────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("searchInput");
  if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") searchCars(); });

  // Load wishlist IDs first, then recommendations
  await loadWishlistIds();
  loadRecommendations();
});
