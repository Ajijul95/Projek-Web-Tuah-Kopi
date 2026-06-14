// assets/js/login.js

async function doLogin() {
  const role = document.getElementById("role").value;
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (role === "admin" && username === "admin" && password === "admin123") {
    setCurrentUser({ role: "admin", name: "Admin", username: "admin" });
    window.location.href = "admin/index.html";
    return;
  }

  if (role === "barista" && username === "barista" && password === "barista123") {
    setCurrentUser({ role: "barista", name: "Barista", username: "barista" });
    window.location.href = "barista/index.html";
    return;
  }

  try {
    const doc = await db.collection("baristas").doc(slugify(username)).get();

    if (doc.exists) {
      const data = doc.data();

      if (data.password === password && data.status !== "nonaktif") {
        setCurrentUser({
          role: "barista",
          name: data.name || username,
          username,
        });
        window.location.href = "barista/index.html";
        return;
      }
    }
  } catch (error) {
    console.error("Gagal cek akun barista:", error);
  }

  alert("Username atau password salah.");
}
