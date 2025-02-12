//for toggling password
document.addEventListener("DOMContentLoaded", function () {
  const togglePassword = document.getElementById("togglePassword");
  const password = document.querySelector('[name="password"]');

  togglePassword.addEventListener("click", function () {
    password.type = password.type === "password" ? "text" : "password";
    this.querySelector("i").classList.toggle("fa-eye");
    this.querySelector("i").classList.toggle("fa-eye-slash");
  });
});
