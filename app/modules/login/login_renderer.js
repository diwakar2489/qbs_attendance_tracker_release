// ✅ Login Function
async function handleLogin(event) {
    event.preventDefault();  // Stop form from refreshing page
    
    const btnloader = document.getElementById("btn-loader");
    btnloader.style.display = "inline-block"; // Show loader

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const successMSG = document.getElementById("success-message");
    const dangerMSG = document.getElementById("danger-message");

    try {
        const response = await window.api.login(email, password);
        console.log(response, 'Login response');

        if (response.success) {
            // ✅ Fetch User Session Info
            const UserSessionInfo = await window.api.getTokens();
            console.log(UserSessionInfo, "User session info");

            successMSG.textContent = `Welcome, ${UserSessionInfo?.name || "User"}! Redirecting...`;
            successMSG.style.display = "inline-block";
            dangerMSG.style.display = "none";

            // ✅ Redirect to Dashboard after 2 seconds
            setTimeout( async () => {
                await window.api.redirectDashboard();
                await window.api.startTokenMonitoring();
            }, 2000);
        } else {
            throw new Error("Invalid User Credentials");
        }
    } catch (error) {
        console.error("Login error:", error);
        dangerMSG.textContent = error.message;
        dangerMSG.style.display = "inline-block";
        successMSG.style.display = "none";
    } finally {
        btnloader.style.display = "none"; // Hide loader
    }
}
// ✅ Auto-run `checkAndLoadTokens` on page load
async function checkAndLoadTokens() {
    try {
        const tokens = await window.api.getTokens();

        if (tokens && tokens.accessToken) {
            console.log("User already logged in, redirecting...");
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        console.error("Token check failed:", error);
    }
}
async function passowrdShowHide() {
    const passwordField = document.getElementById("password");
    const eyeIcon = document.getElementById("eyeIcon");


    if (passwordField.type === "password") {
      passwordField.type = "text";
      eyeIcon.classList.remove("icon-eye");
      eyeIcon.classList.add("icon-eye-crossed");
    } else {
      passwordField.type = "password";
      eyeIcon.classList.remove("icon-eye-crossed");
      eyeIcon.classList.add("icon-eye");
    }
}
document.getElementById("togglePassword").addEventListener("click", passowrdShowHide);
// ✅ Attach Event Listeners Correctly
document.getElementById("loginBtn").addEventListener("click", handleLogin);

// ✅ Run `checkAndLoadTokens` on page load
document.addEventListener("DOMContentLoaded", async () => {
    await checkAndLoadTokens();
    document.getElementById("btn-loader").style.display = "none"; // Hide loader initially
});
