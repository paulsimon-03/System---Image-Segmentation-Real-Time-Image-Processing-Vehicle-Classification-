function generateDatePicker() {
  return ` 
    <span class="todaytext">Select date to show: </span>
    <div class="searchbar-div">
      <input type="date" id="dateinput" />
    </div>`;
}

// call function to show 'web Dashboard' header
document.getElementById("search-calendar").innerHTML = generateDatePicker();
