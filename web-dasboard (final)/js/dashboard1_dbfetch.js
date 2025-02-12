import { getDatabase, database, ref, onValue } from "./connect.js";

// variables to hold chart instances
let leftLaneChartInstance = null;
let rightLaneChartInstance = null;
let selectedLeftLaneData = null;
let selectedRightLaneData = null;
let allClasses = [];
let currentLaneClassIndex = 0;

// firebase reference to the node where data is stored
const dbRef = ref(database, "Image Processing/Image Processing");

// format time to HH:MM:SS AM/PM
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

  // aggregate data points by timestamp. add together count of same timestamp entry for each class
  const aggregatedData = laneData.reduce((acc, entry) => {
    const { Datetime, Count } = entry;
    const timestamp = new Date(Datetime.replace(/ at /, " ")); //May 25, 2024 at 01:11:08 AM UTC+8 - replace 'at' with space then convert to JS date
    const formattedTime = formatTime(timestamp);

    if (!acc[formattedTime]) {
      acc[formattedTime] = { count: 0, timestamp };
    }

    acc[formattedTime].count += Count;
    return acc;
  }, {});

  const dataPoints = Object.keys(aggregatedData).map((time) => ({
    x: time,
    y: aggregatedData[time].count,
  }));

  // sort data by timestamp
  dataPoints.sort(
    (a, b) => new Date(`1970-01-01T${a.x}Z`) - new Date(`1970-01-01T${b.x}Z`)
  );

  const labels = dataPoints.map((dataPoint) => dataPoint.x);

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
    case "bicycle":
      return "#DC4E44";
    case "bus":
      return "#7E80E7";
    case "car":
      return "#00CADC";
    case "e-bike":
      return "#65A6FA";
    case "jeep":
      return "#BB109D";
    case "motorcycle":
      return "#65A6FA";
    case "tricycle":
      return "#49C3FB";
    case "truck":
      return "#D0005F";
    case "van":
      return "#FFCB76";
    default:
      return "#777";
  }
};

// function to filter and aggregate lane data by the selected date
const filterAndAggregateDataByDate = (data, selectedDate) => {
  const filteredData = { "Left Lane": {}, "Right Lane": {} };
  const selectedDateObj = new Date(selectedDate);

  Object.keys(data).forEach((uid) => {
    const uidData = data[uid]; //before the lanes, there are different uids
    ["Left Lane", "Right Lane"].forEach((lane) => {
      if (!uidData[lane]) return;

      //iterate over the different vehicle class for each lane
      Object.keys(uidData[lane]).forEach((className) => {
        if (!filteredData[lane][className]) {
          filteredData[lane][className] = [];
        }

        //iterate over each data entry (unique uuid) for the current vehicle class on each lane
        Object.keys(uidData[lane][className]).forEach((uuid) => {
          const entry = uidData[lane][className][uuid];
          if (!entry.Datetime) return;
          const date = new Date(entry.Datetime.replace(/ at /, " "));
          const dateInManila = new Date(
            date.toLocaleString("en-US", { timeZone: "Asia/Manila" })
          );

          // compare dates
          if (
            dateInManila.getFullYear() === selectedDateObj.getFullYear() &&
            dateInManila.getMonth() === selectedDateObj.getMonth() &&
            dateInManila.getDate() === selectedDateObj.getDate()
          ) {
            filteredData[lane][className].push({ ...entry, uuid });
          }
        });
      });
    });
  });

  //debugging
  console.log("Filtered Data: ", filteredData);
  return filteredData;
};

// Update charts with filtered data
const updateCharts = (selectedDate) => {
  //retrieves the data snapshot whenever there's a change
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();

    if (data) {
      const filteredData = filterAndAggregateDataByDate(data, selectedDate);

      //get data from nodes for left lane and right lane
      selectedLeftLaneData = filteredData["Left Lane"];
      selectedRightLaneData = filteredData["Right Lane"];

      //debugging
      console.log("Selected Left Lane Data:", selectedLeftLaneData);
      console.log("Selected Right Lane Data:", selectedRightLaneData);

      //extract vehicle class names from the filtered data
      allClasses = extractClassNames(filteredData);

      // initialize charts for the first vehicle class available in database
      currentLaneClassIndex = 0;

      const initialClassName = allClasses[currentLaneClassIndex];

      createOrUpdateChart(
        "left-lane-chart",
        selectedLeftLaneData[initialClassName] || [],
        leftLaneChartInstance,
        initialClassName
      );

      createOrUpdateChart(
        "right-lane-chart",
        selectedRightLaneData[initialClassName] || [],
        rightLaneChartInstance,
        initialClassName
      );

      //set span to the initial class name
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
    currentLaneClassIndex = allClasses.length - 1;
  }

  const className = allClasses[currentLaneClassIndex];

  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[className] || [],
    leftLaneChartInstance,
    className
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[className] || [],
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
  if (currentLaneClassIndex >= allClasses.length) {
    currentLaneClassIndex = 0;
  }

  const className = allClasses[currentLaneClassIndex];

  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[className] || [],
    leftLaneChartInstance,
    className
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[className] || [],
    rightLaneChartInstance,
    className
  );

  // update vehicle class span
  document.getElementById("vehicle-class").textContent = className;
});

// extract all class names from filtered data
const extractClassNames = (filteredData) => {
  const classNames = new Set();

  ["Left Lane", "Right Lane"].forEach((lane) => {
    if (filteredData[lane]) {
      Object.keys(filteredData[lane]).forEach((className) => {
        classNames.add(className);
      });
    }
  });

  return Array.from(classNames).sort();
};

// get current date in YYYY-MM-DD format to show initially in the date input
const getCurrentDateInManila = () => {
  const manilaDate = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Manila",
  });
  const manilaDateObj = new Date(manilaDate);
  const year = manilaDateObj.getFullYear();
  const month = ("0" + (manilaDateObj.getMonth() + 1)).slice(-2);
  const day = ("0" + manilaDateObj.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
};

// initialize charts with the current date
const initializeCharts = () => {
  const today = getCurrentDateInManila(); // ccurrent date in Manila time zone
  dateInput.value = today; // show current date on dateinput upon initial launch
  updateCharts(today);
};

// set up the charts
initializeCharts();
