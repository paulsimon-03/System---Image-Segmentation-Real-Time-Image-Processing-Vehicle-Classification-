function generateNavigationbar() {
  const currentPageUrl = window.location.href; //get the current page url

  return `
            <nav id="navbar">
                <ul>
                    <li>
                        <a href="../branch2/dashboard_branch2.html" class="${
                          currentPageUrl.includes("dashboard_branch2.html")
                            ? "active"
                            : ""
                        }"> 
                            <div class="class-icon"></div>
                            <p class="navi-text">By Class</p>
                        </a>
                    </li>
    
                    <li>
                        <a href="../branch2/timedate_branch2.html" class="${
                          currentPageUrl.includes("timedate_branch2.html")
                            ? "active"
                            : ""
                        }">
                            <div class="timedate-icon"></div>
                            <p class="navi-text">Datetime</p>
                        </a>
                    </li>
    
                    <li>
                        <a href="../branch2/statistics_branch2.html" class="${
                          currentPageUrl.includes("statistics_branch2.html")
                            ? "active"
                            : ""
                        }">
                            <div class="stats-icon"></div>
                            <p class="navi-text">Statistics</p>
                        </a>
                    </li>
                </ul>
            </nav>`;
}

// call function to show navigation bar
document.getElementById("navigation-bar").innerHTML = generateNavigationbar();
