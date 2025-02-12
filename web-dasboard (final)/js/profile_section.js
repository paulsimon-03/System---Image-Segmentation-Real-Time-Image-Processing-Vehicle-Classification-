function generateProfile(userName) {
  let usernameText = userName ? userName : "Username"; // use provided username or a default value
  return `
    <button id="profile-settings-btn" type="button">
        <img src="../images/icons8-customer-50.png" id="profile-img" alt="profile img"/> 
    </button>    
        <h4 id="username-text">${usernameText}</h4> 
        <button id="logout-btn" type="button">
            <img src="../images/icons8-logout-64.png" id="logout-img" alt="logout"/>
        </button>   
    `;
}

// call function to show profile
document.getElementById("profile-section").innerHTML = generateProfile();
