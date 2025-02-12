let logoutBtn = document.getElementById("logout-btn");
let usernameText = document.getElementById("username-text");

// logout when logout btn is clicked. redirect to login page
let logoutFunc = () => {
  sessionStorage.removeItem("user-creds");
  sessionStorage.removeItem("user-info");
  window.location.href = "../index.html";
};

let checkCreds = () => {
  let userCreds = JSON.parse(sessionStorage.getItem("user-creds"));
  let userInfo = JSON.parse(sessionStorage.getItem("user-info"));

  // if user credentials are not found, redirect to login page
  if (!userCreds) {
    window.location.href = "../index.html";
  } else {
    // check if element exists before accessing it
    if (usernameText) {
      // display username
      usernameText.innerText = userInfo.userName;
    }
  }
};

window.addEventListener("load", checkCreds);
logoutBtn.addEventListener("click", logoutFunc);
