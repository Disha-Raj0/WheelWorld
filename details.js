// ── Parse URL params ──────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const carId = params.get("id");
const carName = params.get("car");

// ── State ─────────────────────────────────────────────────────
let car = null;
let selectedColourIdx = 0;
let currentSlide = 0;
let currentImages = [];
let isDragging = false,
  dragStartX = 0,
  dragDelta = 0;

const VIEW_LABELS = [
  "Front 3/4 View",
  "Front View",
  "Rear View",
  "Side View",
  "Interior View",
];

// ── Load car from API ─────────────────────────────────────────
async function loadCar() {
  try {
    let data;
    if (carId) {
      data = await Cars.getById(carId);
    } else if (carName) {
      data = await Cars.getByName(carName);
    } else {
      throw new Error("No car specified");
    }
    car = data.car;
    renderCar();
  } catch (err) {
    // Fallback: try local data.js
    if (typeof window.cars !== "undefined") {
      car = window.cars.find((c) => c._id === carId || c.name === carName);
    }
    if (car) {
      renderCar();
    } else {
      document.querySelector(".details-container").innerHTML = `
        <div style="text-align:center;padding:80px 20px;width:100%">
          <div style="font-size:64px;margin-bottom:16px">🚗</div>
          <h2 style="color:var(--navy);margin-bottom:8px">Car Not Found</h2>
          <p style="color:var(--text-muted);margin-bottom:24px">${err.message}</p>
          <a href="index.html" class="book-btn" style="display:inline-block;text-decoration:none;padding:12px 28px">← Back to Home</a>
        </div>`;
    }
  }
}

// ── Render car details ────────────────────────────────────────
function renderCar() {
  document.title = car.name + " - WheelWorld";
  document.getElementById("carName").textContent = car.name;
  document.getElementById("carNameBread").textContent = car.name;
  document.getElementById("carPrice").textContent =
    car.price || "Price on request";
  document.getElementById("carDescription").innerHTML =
    car.description || "<p>No description available.</p>";

  // Specs
  const specs = [
    { label: "Engine", value: car.engine || car.cc },
    { label: "Power", value: car.power },
    { label: "Torque", value: car.torque },
    { label: "Mileage", value: car.mileage },
    { label: "Fuel", value: car.fuel },
    { label: "Transmission", value: car.transmission },
    { label: "Body Type", value: car.type !== "car" ? car.type : null },
    { label: "Safety", value: car.safety },
    { label: "Seats", value: car.seats },
  ];
  const grid = document.getElementById("specsGrid");
  specs.forEach((s) => {
    if (s.value)
      grid.innerHTML += `
      <div class="spec-item">
        <div class="spec-label">${s.label}</div>
        <div class="spec-value">${s.value}</div>
      </div>`;
  });

  // Colour picker
  if (car.colors && car.colors.length > 0) {
    const section = document.getElementById("colourSection");
    const swatchesDiv = document.getElementById("colourSwatches");
    const nameDiv = document.getElementById("colourSelectedName");
    section.style.display = "block";
    nameDiv.textContent = car.colors[0].name;

    car.colors.forEach((col, idx) => {
      const swatch = document.createElement("div");
      swatch.className =
        "colour-swatch" +
        (isLightColor(col.hex) ? " light-swatch" : "") +
        (idx === 0 ? " active" : "");
      swatch.style.background = col.hex;
      const tip = document.createElement("span");
      tip.className = "colour-swatch-tooltip";
      tip.textContent = col.name;
      swatch.appendChild(tip);
      swatch.addEventListener("click", () => {
        document
          .querySelectorAll(".colour-swatch")
          .forEach((s) => s.classList.remove("active"));
        swatch.classList.add("active");
        selectedColourIdx = idx;
        nameDiv.textContent = col.name;
        loadColourImages(idx);
      });
      swatchesDiv.appendChild(swatch);
    });
  }

  loadColourImages(0);
  updateWishBtn();
}

// ── Gallery ───────────────────────────────────────────────────
function loadColourImages(colIdx) {
  currentSlide = 0;
  if (car.colorImages && car.colorImages[colIdx]) {
    currentImages = car.colorImages[colIdx];
  } else {
    currentImages = [car.image || ""];
  }
  buildSlider();
  buildThumbs();
}

function buildSlider() {
  const track = document.getElementById("sliderTrack");
  const dots = document.getElementById("sliderDots");
  const counter = document.getElementById("slideCounter");
  track.innerHTML = "";
  dots.innerHTML = "";

  currentImages.forEach((url, i) => {
    const slide = document.createElement("div");
    slide.className = "slider-slide";
    const img = document.createElement("img");
    img.src = url;
    img.alt = VIEW_LABELS[i] || `View ${i + 1}`;
    img.loading = "lazy";
    img.onerror = function () {
      this.src =
        car.image ||
        "https://via.placeholder.com/664x374?text=View+Not+Available";
    };
    slide.appendChild(img);
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.className = "slider-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Slide ${i + 1}`);
    dot.addEventListener("click", () => goToSlide(i));
    dots.appendChild(dot);
  });

  updateSliderPosition(false);
  updateViewLabel();
  counter.textContent =
    currentImages.length > 1 ? `1 / ${currentImages.length}` : "";
  attachSwipe();
}

function buildThumbs() {
  const strip = document.getElementById("thumbStrip");
  strip.innerHTML = "";
  currentImages.forEach((url, i) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb-item" + (i === 0 ? " active" : "");
    thumb.title = VIEW_LABELS[i] || `View ${i + 1}`;
    const img = document.createElement("img");
    img.src = url;
    img.alt = VIEW_LABELS[i] || `View ${i + 1}`;
    img.loading = "lazy";
    img.onerror = function () {
      this.src = car.image || "";
    };
    const label = document.createElement("span");
    label.className = "thumb-label";
    label.textContent = VIEW_LABELS[i] || `View ${i + 1}`;
    thumb.appendChild(img);
    thumb.appendChild(label);
    thumb.addEventListener("click", () => goToSlide(i));
    strip.appendChild(thumb);
  });
}

function goToSlide(idx) {
  currentSlide = Math.max(0, Math.min(idx, currentImages.length - 1));
  updateSliderPosition(true);
  updateDots();
  updateCounter();
  updateViewLabel();
  updateThumbs();
}
function slideBy(dir) {
  goToSlide(currentSlide + dir);
}

function updateSliderPosition(animate) {
  const track = document.getElementById("sliderTrack");
  track.style.transition = animate
    ? "transform 0.4s cubic-bezier(0.4,0,0.2,1)"
    : "none";
  track.style.transform = `translateX(-${currentSlide * 100}%)`;
  if (!animate) requestAnimationFrame(() => (track.style.transition = ""));
}
function updateDots() {
  document
    .querySelectorAll(".slider-dot")
    .forEach((d, i) => d.classList.toggle("active", i === currentSlide));
}
function updateCounter() {
  const counter = document.getElementById("slideCounter");
  counter.textContent =
    currentImages.length > 1
      ? `${currentSlide + 1} / ${currentImages.length}`
      : "";
}
function updateViewLabel() {
  document.getElementById("viewLabel").textContent =
    VIEW_LABELS[currentSlide] || `View ${currentSlide + 1}`;
}
function updateThumbs() {
  document
    .querySelectorAll(".thumb-item")
    .forEach((t, i) => t.classList.toggle("active", i === currentSlide));
  const strip = document.getElementById("thumbStrip");
  const active = strip.querySelectorAll(".thumb-item")[currentSlide];
  if (active)
    active.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
}

function attachSwipe() {
  const track = document.getElementById("sliderTrack");
  track.addEventListener(
    "touchstart",
    (e) => {
      dragStartX = e.touches[0].clientX;
      isDragging = true;
    },
    { passive: true },
  );
  track.addEventListener(
    "touchmove",
    (e) => {
      if (isDragging) dragDelta = e.touches[0].clientX - dragStartX;
    },
    { passive: true },
  );
  track.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    if (dragDelta < -50) slideBy(1);
    else if (dragDelta > 50) slideBy(-1);
    dragDelta = 0;
  });
  track.addEventListener("mousedown", (e) => {
    dragStartX = e.clientX;
    isDragging = true;
    track.style.cursor = "grabbing";
  });
  window.addEventListener("mousemove", (e) => {
    if (isDragging) dragDelta = e.clientX - dragStartX;
  });
  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = "";
    if (dragDelta < -50) slideBy(1);
    else if (dragDelta > 50) slideBy(-1);
    dragDelta = 0;
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") slideBy(-1);
  if (e.key === "ArrowRight") slideBy(1);
});

// ── Helpers ───────────────────────────────────────────────────
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.75;
}

// ── Book Now ──────────────────────────────────────────────────
async function bookNow() {
  if (!Auth.isLoggedIn()) {
    if (confirm("Please login to book this car. Login now?"))
      window.location.href = "login.html";
    return;
  }
  const colour =
    car && car.colors && car.colors.length > 0
      ? car.colors[selectedColourIdx].name
      : "";
  // Store for payment page
  localStorage.setItem("bookingCarId", car._id || "");
  localStorage.setItem("bookingCar", car.name);
  localStorage.setItem("bookingPrice", car.price);
  localStorage.setItem("bookingColour", colour);
  window.location.href = "payment.html";
}

// ── Wishlist ──────────────────────────────────────────────────
async function toggleWishlistDetail() {
  if (!Auth.isLoggedIn()) {
    if (confirm("Please login to save to Wishlist. Login now?"))
      window.location.href = "login.html";
    return;
  }
  const btn = document.getElementById("wishBtn");
  try {
    const carIdToUse = car._id || car.name;
    if (btn.textContent.includes("Wishlisted")) {
      await Wishlist.remove(carIdToUse);
      btn.textContent = "🤍 Add to Wishlist";
      btn.style.background = "";
      showToast("Removed from Wishlist");
    } else {
      await Wishlist.add(carIdToUse);
      btn.textContent = "❤️ Wishlisted";
      btn.style.background = "#fff5f5";
      showToast("Added to Wishlist ❤️", "success");
    }
    updateWishlistBadge();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function updateWishBtn() {
  const btn = document.getElementById("wishBtn");
  if (!btn || !car || !Auth.isLoggedIn()) return;
  try {
    const data = await Wishlist.get();
    const ids = (data.cars || []).map((c) => c._id || c);
    const isWished = ids.includes(car._id) || ids.includes(car.name);
    btn.textContent = isWished ? "❤️ Wishlisted" : "🤍 Add to Wishlist";
    btn.style.background = isWished ? "#fff5f5" : "";
  } catch {
    /* ignore */
  }
}

// ── Init ──────────────────────────────────────────────────────
loadCar();
