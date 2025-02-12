// connect to realtime database to get data for piechart
import { getDatabase, database, ref, onValue } from "./connect.js";

// variables to hold chart instances
let leftLanePieChartInstance = null;
let rightLanePieChartInstance = null;

// firebase reference to the node where data is stored
const dbRef = ref(database, `Image Processing/Image Processing`);

// function to create or update pie chart
const createOrUpdatePieChart = (canvasId, laneData, laneChartInstance) => {
  const ctx = document.getElementById(canvasId).getContext("2d");
  let chartInstance = laneChartInstance;

  if (chartInstance) {
    chartInstance.destroy(); // destroy existing chart instance
  }

  // extract the keys (vehicle class- Car, Bus, etc.) from the laneData object to be used as the labels for the chart
  const labels = Object.keys(laneData);

  // iterate over the vehicle class in the labels array, then sum up the Count values of all entries for the current vehicle class
  const dataPoints = labels.map((className) => {
    return laneData[className].reduce((total, entry) => total + entry.Count, 0); // initial count of 0
  });

  // Check if there are any non-zero data points
  const hasData = dataPoints.some((point) => point > 0);

  if (!hasData) {
    // Display "No data available" message on the canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "14px 'Poppins', sans-serif"; // Smaller font size
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "No data available",
      ctx.canvas.width / 2,
      ctx.canvas.height / 2
    );
    return;
  }

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

              // calculates the total sum of all data points in the dataset
              const total = dataset.data.reduce((sum, value) => sum + value, 0);

              // maps over labels for the data points in the dataset - array of custom label objects
              return chart.data.labels.map((label, i) => {
                const value = dataset.data[i];

                // calculate the percentage of the total for each value of the classes
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(2) : "0.00"; // set 0.00 when count = 0 instead of NaN
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
              // calculates the total sum of all data points in the dataset
              const total = dataset.reduce((sum, value) => sum + value, 0);
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(2) : "0.00";
              // show both raw count and its percentage for each class
              return `${value} (${percentage}%)`;
            },
          },
          bodyFont: {
            size: 14,
            family: "'Poppins', sans-serif",
          },
          bodyColor: "#fff",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          titleColor: "#fff",
          titleFont: {
            size: 14,
            family: "'Poppins', sans-serif",
          },
        },
      },
      responsive: true,
      maintainAspectRatio: true,
    },
    plugins: [
      {
        //for label inside pie chart
        id: "customLabels",
        afterDatasetsDraw: (chart) => {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
              meta.data.forEach((element, index) => {
                ctx.fillStyle = "#fff";
                const fontSize = 12;
                const fontStyle = "normal";
                const fontFamily = "'Poppins', sans-serif";
                ctx.font = Chart.helpers.fontString(
                  fontSize,
                  fontStyle,
                  fontFamily
                );

                // onvert to string
                const dataString = dataset.data[index].toString();

                // alignment settings in center
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                const padding = 5;
                const position = element.tooltipPosition();
                ctx.fillText(
                  dataString,
                  position.x,
                  position.y - fontSize / 2 - padding
                );
              });
            }
          });
        },
      },
    ],
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

// function to filter lane data by the selected date and time of user
const filterDataByDateTime = (data, selectedDateTime) => {
  const filteredData = { "Left Lane": {}, "Right Lane": {} };
  const selectedDateTimeObj = new Date(selectedDateTime);
  const selectedDate = selectedDateTimeObj.toISOString().split("T")[0];
  const selectedHour = selectedDateTimeObj.getHours();

  Object.keys(data).forEach((uid) => {
    const uidData = data[uid];
    ["Left Lane", "Right Lane"].forEach((lane) => {
      if (!uidData[lane]) return;

      Object.keys(uidData[lane]).forEach((className) => {
        if (!filteredData[lane][className]) {
          filteredData[lane][className] = [];
        }

        Object.keys(uidData[lane][className]).forEach((uuid) => {
          const entry = uidData[lane][className][uuid];
          if (!entry.Datetime) return;
          const date = new Date(entry.Datetime.replace(/ at /, " "));
          const dateInManila = new Date(
            date.toLocaleString("en-US", { timeZone: "Asia/Manila" })
          );

          const entryDate = dateInManila.toISOString().split("T")[0];
          const entryHour = dateInManila.getHours();

          if (entryDate === selectedDate && entryHour === selectedHour) {
            filteredData[lane][className].push(entry);
          }
        });
      });
    });
  });

  return filteredData;
};

// update charts with filtered data
const updateCharts = (selectedDateTime) => {
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();

    if (data) {
      const filteredData = filterDataByDateTime(data, selectedDateTime);

      const filteredLeftLaneData = filteredData["Left Lane"];
      const filteredRightLaneData = filteredData["Right Lane"];

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

      const leftTotal = Object.values(filteredLeftLaneData)
        .flat()
        .reduce((sum, entry) => sum + entry.Count, 0);
      const rightTotal = Object.values(filteredRightLaneData)
        .flat()
        .reduce((sum, entry) => sum + entry.Count, 0);

      const totalCount = leftTotal + rightTotal;

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

      document.getElementById(
        "left-total-count"
      ).textContent = `(Total Count: ${leftTotal})`;
      document.getElementById(
        "right-total-count"
      ).textContent = `(Total Count: ${rightTotal})`;

      document.getElementById(
        "total-count"
      ).textContent = `Total Count for Both Lanes: ${totalCount} (${startTime} - ${endTime})`;
    } else {
      console.error("No data available.");
    }
  });
};

// datetime input field event listener
const datetimeInput = document.getElementById("dateinput");
datetimeInput.addEventListener("change", (event) => {
  const selectedDateTime = event.target.value;
  updateCharts(selectedDateTime);
});

// initialize charts with the current date and time upon initial launch
const initializeCharts = () => {
  const now = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  const manilaTime = new Date(now);
  const year = manilaTime.getFullYear();
  const month = String(manilaTime.getMonth() + 1).padStart(2, "0");
  const day = String(manilaTime.getDate()).padStart(2, "0");
  const hours = String(manilaTime.getHours()).padStart(2, "0");
  const minutes = String(manilaTime.getMinutes()).padStart(2, "0");

  const formattedNow = `${year}-${month}-${day}T${hours}:${minutes}`;
  datetimeInput.value = formattedNow;
  updateCharts(formattedNow);
};

// call initializeCharts function to set up the charts
initializeCharts();
