import { getDatabase, database, ref, onValue } from "./connect.js";

//firebase reference to the node where data is stored
const dbRef = ref(database, `Speed Estimation`);
onValue(
  dbRef,
  (snapshot) => {
    const data = snapshot.val();

    //update stats box (mean, median, mode. mean = average traffic flow)
    if (data) {
      const leftAverageSpeed =
        data["Left Lane"]["Average Traffic Flow Speed"][
          "Avarage Traffic Flow Speed leftlane"
        ];
      const rightAverageSpeed =
        data["Right Lane"]["Average Traffic Flow Speed"][
          "Avarage Traffic Flow Speed rightlane"
        ];

      const leftMedianSpeed =
        data["Speed Estimation"]["Average Traffic Flow Speed"]["Statistics"][
          "Left lane"
        ]["median"];
      const RightMedianSpeed =
        data["Speed Estimation"]["Average Traffic Flow Speed"]["Statistics"][
          "Right lane"
        ]["median"];

      const leftModeSpeed =
        data["Speed Estimation"]["Average Traffic Flow Speed"]["Statistics"][
          "Left lane"
        ]["mode"];
      const rightModeSpeed =
        data["Speed Estimation"]["Average Traffic Flow Speed"]["Statistics"][
          "Right lane"
        ]["mode"];

      document.getElementById(
        "left-average-flowspeed"
      ).textContent = `${leftAverageSpeed} km/h`;
      document.getElementById(
        "right-average-flowspeed"
      ).textContent = `${rightAverageSpeed} km/h`;

      document.getElementById(
        "left-median"
      ).textContent = `${leftMedianSpeed} km/h`;

      document.getElementById(
        "right-median"
      ).textContent = `${RightMedianSpeed} km/h`;

      document.getElementById(
        "left-mode"
      ).textContent = `${leftModeSpeed} km/h`;

      document.getElementById(
        "right-mode"
      ).textContent = `${rightModeSpeed} km/h`;
    } else {
      console.error("No data available.");
    }
  },
  (error) => {
    console.error("Error getting data: ", error);
  }
);

// chart config
let leftLaneChartInstance = null;
let rightLaneChartInstance = null;
let selectedLeftLaneData = null;
let selectedRightLaneData = null;
let leftLaneClasses = [];
let rightLaneClasses = [];
let currentLeftLaneClassIndex = 0;
let currentRightLaneClassIndex = 0;

// format time to HH:MM:SS in Manila time
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// function to create or update chart
const createOrUpdateChart = (chartId, laneData, laneChartInstance) => {
  console.log("Creating or updating chart...");
  console.log("Chart ID:", chartId);
  console.log("Lane Data:", laneData);

  const dataPoints = [];

  // iterate over laneData object to extract timestamps and corresponding speed
  Object.keys(laneData).forEach((timestamp) => {
    const speeds = laneData[timestamp];
    const timestampLabel = formatTime(timestamp);

    // iterate over the speed data
    Object.entries(speeds).forEach(([id, speed], index) => {
      // create a unique label for each data point
      const uniqueLabel = `${timestampLabel} (${index + 1})`;
      dataPoints.push({ label: uniqueLabel, y: speed });
    });
  });

  console.log("Data Points:", dataPoints);

  // dynamically calculate the min-width based on the number of data points
  const spacing = 25;
  const minWidth = dataPoints.length * spacing;
  const chartElement = document.getElementById(chartId);
  chartElement.style.minWidth = `${minWidth}px`;

  const chart = new CanvasJS.Chart(chartId, {
    animationEnabled: true,
    theme: "dark1",
    backgroundColor: "#381f50",
    title: {
      text: "",
    },
    axisX: {
      title: "Time",
      labelFontColor: "#ffffff",
      titleFontColor: "#ffffff",
      labelFontSize: 14,
      titleFontSize: 16,
      interval: 1,
      labelAngle: -60,
      labelFormatter: function (e) {
        return e.label;
      },
    },
    axisY: {
      title: "Speed (km/h)",
      labelFontColor: "#ffffff",
      titleFontColor: "#ffffff",
      labelFontSize: 14,
      titleFontSize: 16,
      includeZero: true,
    },
    data: [
      {
        type: "column",
        name: "Vehicle Speed",
        showInLegend: false,
        dataPoints: dataPoints,
        color: getBarColor(leftLaneClasses[currentLeftLaneClassIndex]),
      },
    ],
  });

  chart.render();

  if (chartId === "left-lane-chart") {
    leftLaneChartInstance = chart;
  } else {
    rightLaneChartInstance = chart;
  }
};

// change color of bars per class
const getBarColor = (vehicleClass) => {
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
    case "motorycle":
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

// update charts based on selected date of user
const updateCharts = (selectedDate) => {
  onValue(
    dbRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // get data from nodes for left lane and right lane
        const leftLaneData = data["Left Lane"]["Class"];
        const rightLaneData = data["Right Lane"]["Class"];

        // extract vehicle class names for left and right lanes
        leftLaneClasses = extractClassNames(leftLaneData);
        rightLaneClasses = extractClassNames(rightLaneData);

        // filter lane data based on the selected date
        selectedLeftLaneData = filterDataByDate(leftLaneData, selectedDate);
        selectedRightLaneData = filterDataByDate(rightLaneData, selectedDate);

        console.log("Selected Left Lane Data:", selectedLeftLaneData);
        console.log("Selected Right Lane Data:", selectedRightLaneData);

        // update charts with the filtered lane data
        createOrUpdateChart(
          "left-lane-chart",
          selectedLeftLaneData[leftLaneClasses[currentLeftLaneClassIndex]],
          leftLaneChartInstance
        );
        createOrUpdateChart(
          "right-lane-chart",
          selectedRightLaneData[rightLaneClasses[currentRightLaneClassIndex]],
          rightLaneChartInstance
        );

        document.getElementById("vehicle-class").textContent =
          leftLaneClasses[currentLeftLaneClassIndex];
      } else {
        console.error("No data available.");
      }
    },
    (error) => {
      console.error("Error getting data: ", error);
    }
  );
};

// filters lane data based on the selected date by iterating over the lane data and comparing timestamps
// laneData - object containing timestamp and count for each class, selectedDate - user YYYY-MM-DD
const filterDataByDate = (laneData, selectedDate) => {
  const filteredData = {};
  const selectedDateObj = new Date(selectedDate);

  // iterate over each class name
  Object.keys(laneData).forEach((className) => {
    filteredData[className] = {}; // Store filtered data

    // iterate over each timestamp within the current class
    Object.keys(laneData[className]).forEach((timestamp) => {
      // Convert each timestamp string to a Date object
      const timestampDate = new Date(timestamp);
      if (
        // if timestamp data (get only date part from May 24, 2024 at 01:11:08 AM UTC+8) === selected date, add that timestamp and its corresponding data to the filtered data for the current class
        timestampDate.toLocaleDateString("en-US", {
          timeZone: "Asia/Manila",
        }) ===
        selectedDateObj.toLocaleDateString("en-US", {
          timeZone: "Asia/Manila",
        })
      ) {
        filteredData[className][timestamp] = laneData[className][timestamp];
      }
    });
  });
  return filteredData;
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

// decrease the currentLaneClassIndex to show the previous vehicle class
leftArrow.addEventListener("click", () => {
  currentLeftLaneClassIndex--;
  currentRightLaneClassIndex--;

  // wraps around to the last index if index < 0
  if (currentLeftLaneClassIndex < 0) {
    currentLeftLaneClassIndex = leftLaneClasses.length - 1;
  }
  if (currentRightLaneClassIndex < 0) {
    currentRightLaneClassIndex = rightLaneClasses.length - 1;
  }

  // retrieve the class names for the left and right lanes based on the updated indices
  const leftLaneClassName = leftLaneClasses[currentLeftLaneClassIndex];
  const rightLaneClassName = rightLaneClasses[currentRightLaneClassIndex];

  // update charts with the data for the corresponding vehicle classes
  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[leftLaneClassName],
    leftLaneChartInstance
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[rightLaneClassName],
    rightLaneChartInstance
  );

  document.getElementById("vehicle-class").textContent = leftLaneClassName;
});

// increase the currentLaneClassIndex to show the next vehicle class
rightArrow.addEventListener("click", () => {
  currentLeftLaneClassIndex++;
  currentRightLaneClassIndex++;

  // wraps around to the first index if the index exceeds the length of the array
  if (currentLeftLaneClassIndex >= leftLaneClasses.length) {
    currentLeftLaneClassIndex = 0;
  }
  if (currentRightLaneClassIndex >= rightLaneClasses.length) {
    currentRightLaneClassIndex = 0;
  }

  const leftLaneClassName = leftLaneClasses[currentLeftLaneClassIndex];
  const rightLaneClassName = rightLaneClasses[currentRightLaneClassIndex];

  // update charts with the data for the corresponding vehicle classes
  createOrUpdateChart(
    "left-lane-chart",
    selectedLeftLaneData[leftLaneClassName],
    leftLaneChartInstance
  );

  createOrUpdateChart(
    "right-lane-chart",
    selectedRightLaneData[rightLaneClassName],
    rightLaneChartInstance
  );

  document.getElementById("vehicle-class").textContent = leftLaneClassName;
});

// extract class names from lane data
const extractClassNames = (laneData) => {
  const classNames = [];

  // retrieves the array containing the keys = class names (car, bus, etc.)
  Object.keys(laneData).forEach((className) => {
    classNames.push(className);
  });
  return classNames;
};

// initialize charts with the current date in Manila time
const currentDate = new Date().toLocaleDateString("en-CA", {
  timeZone: "Asia/Manila",
});
dateInput.value = currentDate;
updateCharts(currentDate);
console.log(currentDate);
