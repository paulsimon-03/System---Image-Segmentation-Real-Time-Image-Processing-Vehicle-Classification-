// connect to realtime database to get data for piechart
import { getDatabase, database, ref, onValue } from "./connect.js";

// variables to hold chart instances
let leftLanePieChartInstance = null;
let rightLanePieChartInstance = null;

//firebase reference to the node where data is stored
const dbRef = ref(database, `Image Processing`);

// function to create or update pie chart
const createOrUpdatePieChart = (canvasId, laneData, laneChartInstance) => {
  const ctx = document.getElementById(canvasId).getContext("2d");
  let chartInstance = laneChartInstance;

  if (chartInstance) {
    chartInstance.destroy(); // destroy existing chart instance
  }

  //extract the keys (vehicle class- Car, Bus, etc.) from the laneData object to be used as the labels for the chart
  const labels = Object.keys(laneData);

  // iterate over the vehicle class in the labels array. then sum up the Count values of all entries for the current vehicle class
  const dataPoints = labels.map((className) => {
    return laneData[className].reduce((total, entry) => total + entry.Count, 0); //initial count of 0
  });

  const backgroundColors = labels.map((className) => getPieColor(className));

  chartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: dataPoints,
          backgroundColor: backgroundColors,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          display: true,
          labels: {
            generateLabels: (chart) => {
              // array of datasets for the chart. since there is typically only one dataset in a pie chart, access the first dataset
              const dataset = chart.data.datasets[0];

              //calculates the total sum of all data points in the dataset
              const total = dataset.data.reduce((sum, value) => sum + value, 0);

              //maps over labels for the data points in the dataset - array of custom label objects
              return chart.data.labels.map((label, i) => {
                const value = dataset.data[i];

                //calculate the percentage of the total for each value of the classes
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(2) : "0.00"; //set 0.00 when count = 0 instead of NaN
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  hidden: false,
                  fontColor: "#fff",
                  fontSize: 15,
                };
              });
            },
            color: "#fff",
            font: {
              size: 14,
              family: "'Poppins', sans-serif",
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (tooltipItem) => {
              const value = tooltipItem.raw;
              const dataset = tooltipItem.dataset.data;
              //calculates the total sum of all data points in the dataset
              const total = dataset.reduce((sum, value) => sum + value, 0);
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(2) : "0.00";
              //show both raw count and its percentage for each class
              return `${value} (${percentage}%)`;
            },
          },
          bodyFont: {
            size: 15,
            family: "'Poppins', sans-serif",
          },
          bodyColor: "#fff",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          titleColor: "#fff",
          titleFont: {
            size: 15,
            family: "'Poppins', sans-serif",
          },
        },
      },
      responsive: true,
      maintainAspectRatio: true,
    },
  });

  if (canvasId === "left-lane-pie") {
    leftLanePieChartInstance = chartInstance;
  } else {
    rightLanePieChartInstance = chartInstance;
  }
};

// function to get pie color based on vehicle type
const getPieColor = (vehicleClass) => {
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

//laneData: object containing data for different vehicle class; selectedDateTime: date and time selected by the user in string format
// function to filter lane data by the selected date and time of user
const filterDataByDateTime = (laneData, selectedDateTime) => {
  const filteredData = {}; //store the filtered results
  const selectedDateTimeObj = new Date(selectedDateTime); //convert to JS date
  const selectedDate = selectedDateTimeObj.toISOString().split("T")[0]; //get YYYY-MM-DD only in the datetime obj
  const selectedHour = selectedDateTimeObj.getHours(); //get the hour

  //iterate over the different vehicle class for each lane
  Object.keys(laneData).forEach((className) => {
    filteredData[className] = [];

    //iterate over each data entry (unique uuid) for the current vehicle class
    Object.keys(laneData[className]).forEach((uuid) => {
      const entry = laneData[className][uuid];
      //time in database is stored fully (ex:May 24, 2024 at 01:11:08 AM UTC+8). replace 'at' with space then convert to JS date
      const date = new Date(entry.Datetime.replace(/ at /, " "));

      const entryDate = date.toISOString().split("T")[0]; //get date (YYYY-MM-DD)
      const entryHour = date.getHours();

      //if the selected datetime is equal to the entry data in firebase, then filter that to be shown in chart. to ensure only the selected datetime data is shown not all from database
      if (entryDate === selectedDate && entryHour === selectedHour) {
        filteredData[className].push(entry);
      }
    });
  });

  console.log("Filtered Data: ", filteredData);
  return filteredData;
};

// update charts with filtered data
const updateCharts = (selectedDateTime) => {
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();

    if (data) {
      //get data from nodes for left lane and right lane
      const filteredLeftLaneData = filterDataByDateTime(
        data["Left Lane"],
        selectedDateTime
      );
      const filteredRightLaneData = filterDataByDateTime(
        data["Right Lane"],
        selectedDateTime
      );

      createOrUpdatePieChart(
        "left-lane-pie",
        filteredLeftLaneData,
        leftLanePieChartInstance
      );
      createOrUpdatePieChart(
        "right-lane-pie",
        filteredRightLaneData,
        rightLanePieChartInstance
      );

      //calculate total count for left & right lane
      const leftTotal = Object.values(filteredLeftLaneData)
        .flat()
        .reduce((sum, entry) => sum + entry.Count, 0);
      const rightTotal = Object.values(filteredRightLaneData)
        .flat()
        .reduce((sum, entry) => sum + entry.Count, 0);

      //overall total of both lanes
      const totalCount = leftTotal + rightTotal;

      // format time interval (ex: 1:00 PM - 1:59 PM)
      const selectedDateTimeObj = new Date(selectedDateTime);
      const startTime = new Date(
        selectedDateTimeObj.setMinutes(0, 0, 0)
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = new Date(
        selectedDateTimeObj.setMinutes(59, 59, 999)
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      //display count for left & right lanes
      document.getElementById(
        "left-total-count"
      ).textContent = `(Total Count: ${leftTotal})`;
      document.getElementById(
        "right-total-count"
      ).textContent = `(Total Count: ${rightTotal})`;

      // total count of both with the selected time interval
      document.getElementById(
        "total-count"
      ).textContent = `Total Count for Both Lanes: ${totalCount} (${startTime} - ${endTime})`;
    } else {
      console.error("No data available.");
    }
  });
};

// datetime input field event whenever there is change, chart will be updated
const datetimeInput = document.getElementById("dateinput");
datetimeInput.addEventListener("change", (event) => {
  const selectedDateTime = event.target.value;
  updateCharts(selectedDateTime);
});

// initialize charts with the current date and time upon initial launch
const initializeCharts = () => {
  // use manila timezone
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaTime = new Date(now);
  const year = manilaTime.getFullYear(); //ex: 2024
  const month = String(manilaTime.getMonth() + 1).padStart(2, "0"); // 0-11 -> 1-12. padstart: 2 digits with leading 0 (May = 05)
  const day = String(manilaTime.getDate()).padStart(2, "0");
  const hours = String(manilaTime.getHours()).padStart(2, "0");
  const minutes = String(manilaTime.getMinutes()).padStart(2, "0");

  const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`; //YYYY-MM-DDTHH:MM format for datetime-local
  datetimeInput.value = formattedNow;
  updateCharts(formattedNow);
};

//call initializeCharts function to set up the charts
initializeCharts();
