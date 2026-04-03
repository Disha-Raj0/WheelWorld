/**
 * auth.js — WheelWorld Authentication
 * Calls backend API instead of localStorage
 */

async function register() {
  const username = document.getElementById("regUser").value.trim();
  const emailEl = document.getElementById("regEmail");
  const email = emailEl ? emailEl.value.trim() : username + "@wheelworld.in";
  const password = document.getElementById("regPass").value;
  const btn = document.querySelector(".auth-btn");

  if (!username || !password) {
    showToast("Please fill in all fields", "error");
    return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }

  try {
    btn.textContent = "Creating account...";
    btn.disabled = true;
    await Auth.register(username, email, password);
    btn.textContent = "✅ Account Created!";
    btn.style.background = "#16a34a";
    showToast("Registered successfully! Welcome 🎉", "success");
    setTimeout(() => (window.location.href = "index.html"), 900);
  } catch (err) {
    btn.textContent = "Create Account →";
    btn.disabled = false;
    btn.style.background = "";
    showToast(err.message || "Registration failed", "error");
  }
}

async function login() {
  const loginVal = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;
  const btn = document.querySelector(".auth-btn");

  if (!loginVal || !password) {
    showToast("Please enter username and password", "error");
    return;
  }

  try {
    btn.textContent = "Logging in...";
    btn.disabled = true;
    await Auth.login(loginVal, password);
    btn.textContent = "✅ Welcome back!";
    btn.style.background = "#16a34a";
    showToast("Login successful!", "success");
    setTimeout(() => (window.location.href = "index.html"), 700);
  } catch (err) {
    btn.textContent = "Login →";
    btn.disabled = false;
    btn.style.background = "";
    showToast(err.message || "Login failed", "error");
    document.querySelectorAll(".field-group input").forEach((i) => {
      i.style.borderColor = "var(--primary)";
      i.style.boxShadow = "0 0 0 3px rgba(232,56,13,0.15)";
    });
  }
}
