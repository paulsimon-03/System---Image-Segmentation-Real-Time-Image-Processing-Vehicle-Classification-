function generateHeader() {
  return ` 
    <div class="parallelogram">
        <h1 id="dash-heading">Web Dashboard</h1>
        <h1 id="vehicle-detection"> Vehicle Detection </h1>
        <div class="dash-underbox"></div>
    </div>`;
}

// call function to show 'web Dashboard' header
document.getElementById("dashboard-title").innerHTML = generateHeader();
