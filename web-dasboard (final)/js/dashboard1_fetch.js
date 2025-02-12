import { getDatabase, database, ref, onValue } from "./connect.js";
//for charts

// variables to hold chart instances
let leftLaneChartInstance = null;
let rightLaneChartInstance = null;
let selectedLeftLaneData = null;
let selectedRightLaneData = null;
let leftLaneClasses = [];
let rightLaneClasses = [];
let currentLaneClassIndex = 0;

//firebase reference to the node where data is stored
const dbRef = ref(database, `Image Processing`);

//format time to HH:MM:SS AM/PM
const formatTime = (date) => {
  let hours = date.getHours();
  //mins & secs - 2 digits (ex: 4 will be 04)
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // convert 0 to 12 (12-hour format)
  return `${hours}:${minutes}:${seconds} ${period}`;
};

// function to create or update chart
const createOrUpdateChart = (
  canvasId, //for left-lane-chart & right-lane-chart
  laneData, //array of data entries from database
  laneChartInstance,
  vehicleClass
) => {
  const ctx = document.getElementById(canvasId).getContext("2d");
  let chartInstance = laneChartInstance;

  if (chartInstance) {
    chartInstance.destroy(); // destroy existing chart instance
  }

  //get time and count of each class on the left and right lane data
  let dataPoints = laneData.map((entry) => {
    const { Datetime, Count } = entry;
    const timestamp = new Date(Datetime.replace(/ at /, " ")); //May 24, 2024 at 01:11:08 AM UTC+8 - replace 'at' with space then convert to JS date
    return { x: timestamp, y: Count }; //x axis - time, y - count
  });

  // sort data by timestamp
  dataPoints.sort((a, b) => a.x - b.x);

  // format timestamps back into strings (HH:MM:SS AM/PM) for display. call formatTime function
  const labels = dataPoints.map((dataPoint) => formatTime(dataPoint.x));

  // update data points to use formatted strings for x value
  dataPoints = dataPoints.map((dataPoint, index) => ({
    x: labels[index],
    y: dataPoint.y,
  }));

  const datasets = [
    {
      label: "Count",
      data: dataPoints,
      borderWidth: 1,
      borderColor: getLineColor(vehicleClass),
      backgroundColor: getLineColor(vehicleClass),
      pointRadius: 4,
      pointHoverRadius: 6,
    },
  ];

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#fff",
            font: {
              size: 15,
              family: "'Poppins', sans-serif",
            },
          },
          grid: {
            color: "rgba(115, 115, 115, 0.4)",
          },
          title: {
            display: true,
            text: "Time",
            color: "#fff",
            font: {
              size: 15,
              family: "'Poppins', sans-serif",
            },
          },
        },
        y: {
          ticks: {
            color: "#fff",
            font: {
              size: 15,
              family: "'Poppins', sans-serif",
            },
          },
          grid: {
            color: "rgba(115, 115, 115, 0.4)",
          },
          beginAtZero: true,
          title: {
            display: true,
            text: "Count",
            color: "#fff",
            font: {
              size: 15,
              family: "'Poppins', sans-serif",
            },
          },
        },
      },
      responsive: true,
      maintainAspectRatio: true,
    },
  });

  if (canvasId === "left-lane-chart") {
    leftLaneChartInstance = chartInstance;
  } else {
    rightLaneChartInstance = chartInstance;
  }
};

// get line color based on vehicle class
const getLineColor = (vehicleClass) => {
  switch (vehicleClass) {
    case "Bicycle":
      return "#DC4E44";
    case "Bus":
      return "#7E80E7";
    case "Car":
      return "#00CADC";
    case "E-Bike":
      return "#65A6FA";
    case "Jeep":
      return "#BB109D";
    case "Motorcycle":
      return "#65A6FA";
    case "Tricycle":
      return "#49C3FB";
    case "Truck":
      return "#D0005F";
    case "Van":
      return "#FFCB76";
    default:
      return "#777";
  }
};

//laneData: object containing data for different vehicle class; selectedDate: date selected by the user in string format
// function to filter lane data by the selected date  of user
const filterDataByDate = (laneData, selectedDate) => {
  const filteredData = {};
  const selectedDateObj = new Date(selectedDate); //convert to JS date

  //iterate over the different vehicle class for each lane
  Object.keys(laneData).forEach((className) => {
    filteredData[className] = [];

    //iterate over each data entry (unique uuid) for the current vehicle class
    Object.keys(laneData[className]).forEach((uuid) => {
      const entry = laneData[className][uuid];
      if (!entry.Datetime) return; // skip entries without a datetime field
      const date = new Date(entry.Datetime.replace(/ at /, " "));
      const dateInManila = new Date(
        date.toLocaleString("en-US", { timeZone: "Asia/Manila" })
      );

      // compare the dates correctly
      if (
        dateInManila.getFullYear() === selectedDateObj.getFullYear() &&
        dateInManila.getMonth() === selectedDateObj.getMonth() &&
        dateInManila.getDate() === selectedDateObj.getDate()
      ) {
        filteredData[className].push(entry);
      }
    });
  });

  console.log("Filtered Data: ", filteredData);
  return filteredData;
};

// update charts with filtered data
const updateCharts = (selectedDate) => {
  //retrieves the data snapshot whenever there's a change
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();

    if (data) {
      //get data from nodes for left lane and right lane
      const filteredLeftLaneData = filterDataByDate(
        data["Left Lane"],
        selectedDate
      );
      const filteredRightLaneData = filterDataByDate(
        data["Right Lane"],
        selectedDate
      );

      selectedLeftLaneData = filteredLeftLaneData;
      selectedRightLaneData = filteredRightLaneData;

      //extract vehicle class names from the filtered data
      leftLaneClasses = extractClassNames(filteredLeftLaneData);
      rightLaneClasses = extractClassNames(filteredRightLaneData);

      console.log("Selected Left Lane Data:", selectedLeftLaneData);
      console.log("Selected Right Lane Data:", selectedRightLaneData);

      // initialize charts for the first vehicle class (bicycle)
      currentLaneClassIndex = 0;
      const initialClassName = leftLaneClasses[currentLaneClassIndex];

      createOrUpdateChart(
        "left-lane-chart",
        filteredLeftLaneData[initialClassName],
        leftLaneChartInstance,
        initialClassName
      );

      createOrUpdateChart(
        "right-lane-chart",
        filteredRightLaneData[initialClassName],
        rightLaneChartInstance,
        initialClassName
      );

      //set vehicle class span on initial load
      document.getElementById("vehicle-class").textContent = initialClassName;
    } else {
      console.error("No data available.");
    }
  });
};

// datetime input field event whenever there is change, chart will be updated
const dateInput = document.getElementById("dateinput");
dateInput.addEventListener("change", (event) => {
  const selectedDate = event.target.value;
  updateCharts(selectedDate);
});

// event listeners for vehicle class navigation
const leftArrow = document.getElementById("arrow-prev-btn");
const rightArrow = document.getElementById("arrow-next-btn");

//decrease the currentLaneClassIndex to show the previous vehicle class
leftArrow.addEventListener("click", () => {
  currentLaneClassIndex--;

  //if index goes < 0, wrap around to the last class
  if (currentLaneClassIndex < 0) {
    currentLaneClassIndex = leftLaneClasses.length - 1;
  }

  const className = leftLaneClasses[currentLaneClassIndex];

  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[className],
    leftLaneChartInstance,
    className
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[className],
    rightLaneChartInstance,
    className
  );

  // update vehicle class span
  document.getElementById("vehicle-class").textContent = className;
});

//increase the currentLaneClassIndex to show the next vehicle class
rightArrow.addEventListener("click", () => {
  currentLaneClassIndex++;

  //if index goes > 0, wrap around to the last class
  if (currentLaneClassIndex >= leftLaneClasses.length) {
    currentLaneClassIndex = 0;
  }

  const className = leftLaneClasses[currentLaneClassIndex];

  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[className],
    leftLaneChartInstance,
    className
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[className],
    rightLaneChartInstance,
    className
  );

  // update vehicle class span
  document.getElementById("vehicle-class").textContent = className;
});

// extract class names from lane data
const extractClassNames = (laneData) => {
  return Object.keys(laneData); //retrieves the array containing the keys = class names (car, bus, etc.)
};

// get current date in PH Manila time zone
const getCurrentDateInManila = () => {
  const date = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
  });
  const manilaDate = new Date(date);
  return manilaDate.toISOString().split("T")[0]; // YYYY-MM-DD format
};

// initialize charts with the current date
const initializeCharts = () => {
  const today = getCurrentDateInManila(); // get current date in Asia/Manila time zone
  dateInput.value = today; //show current date on dateinput upon initial launch
  updateCharts(today);
};

//set up the charts
initializeCharts();
