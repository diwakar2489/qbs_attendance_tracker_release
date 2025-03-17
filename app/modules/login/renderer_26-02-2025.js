const loginForm = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");


loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  window.api.login({ email, password });
  window.api.onLoginResponse((response) => {
    if (response.success) {
      messageDiv.textContent = `Welcome, ${response.data.name}! Redirecting...`;
      setTimeout(() => {
        window.location = "./dashboard.html";
      }, 2000);
    } else {
      messageDiv.textContent = `Error: ${response.error}`;
    }
  });
});
// document.addEventListener("DOMContentLoaded", () => {
//   const passwordField = document.getElementById("password");
//   const togglePassword = document.getElementById("togglePassword");
//   const eyeIcon = document.getElementById("eyeIcon");

//   togglePassword.addEventListener("click", () => {
//     // Toggle the type attribute of the password field
//     if (passwordField.type === "password") {
//       passwordField.type = "text";
//       eyeIcon.classList.remove("icon-eye");
//       eyeIcon.classList.add("icon-eye-crossed");
//     } else {
//       passwordField.type = "password";
//       eyeIcon.classList.remove("icon-eye-crossed");
//       eyeIcon.classList.add("icon-eye");
//     }
//   });
// });
