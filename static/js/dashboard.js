Chart.defaults.color = "#ffffff";
Chart.defaults.font.weight = "bold";

function initC(id, type, lX, lY, col) {
  return new Chart(document.getElementById(id).getContext("2d"), {
    type: type,
    data: { labels: Array(30).fill(""), datasets: [{ borderColor: col, backgroundColor: col + "33", borderWidth: 3, data: Array(30).fill(0), fill: true, pointRadius: 0 }] },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: lX, color: "#f59e0b", font: { size: 10 } }, grid: { display: false } },
        y: { title: { display: true, text: lY, color: "#f59e0b", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } },
      },
    },
  });
}

const sensorChart = initC("sensorChart", "line", "TIME (S)", "TURBIDITY (NTU)", "#22d3ee");
const depthChart = initC("depthChart", "bar", "LOG", "DELTA (CM)", "#3b82f6");

const bridgeChart = new Chart(document.getElementById("bridgeChart").getContext("2d"), {
  type: "line",
  data: { labels: Array(20).fill(""), datasets: [{ label: "Safety", data: Array(20).fill(1), borderColor: "#10b981", borderWidth: 4, pointRadius: 0, fill: true, backgroundColor: "rgba(16,185,129,0.1)", tension: 0.4 }] },
  options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 1.2, title: { display: true, text: "SAFETY FACTOR", color: "#f59e0b" } }, x: { title: { display: true, text: "TIME FORECAST (H)", color: "#f59e0b" } } } },
});

function updateDashboard() {
  fetch("/latest")
    .then((res) => res.json())
    .then((data) => {
      const turb = parseFloat(data.Turbidity) || 35 + Math.random() * 5;
      const vib = parseFloat(data.Vibration) || 0.2 + Math.random() * 0.4;
      const dep = parseFloat(data.Depth) || 0;
      const lat = parseFloat(data.Latitude);
      const lng = parseFloat(data.Longitude);

      document.getElementById("val-turbidity").innerText = turb.toFixed(1);
      document.getElementById("val-vibration").innerText = vib.toFixed(2);
      document.getElementById("val-depth").innerText = dep.toFixed(1);
      document.getElementById("gps-coords").innerText = `[${lat.toFixed(4)}, ${lng.toFixed(4)}]`;

      const isMining = (turb > 400 && vib > 25) || dep > 5;
      const card = document.getElementById("alert-card");
      const bh = document.getElementById("bridge-health");
      const scourFill = document.getElementById("scour-fill");

      const factor = isMining ? Math.max(0.4, 1.0 - dep / 50) : 1.0;

      if (isMining) {
        card.classList.add("mining-alert");
        document.getElementById("val-status").innerText = "ALERT: MINING";
        if (bh) {
          bh.innerText = `Factor: ${factor.toFixed(2)} Danger`;
          bh.className = "text-[10px] font-bold text-red-500 uppercase";
        }
        document.getElementById("val-vessel").innerText = "Dredge Detected";
        document.getElementById("val-rpm").innerText = "1840 RPM";
      } else {
        card.classList.remove("mining-alert");
        document.getElementById("val-status").innerText = "SECURE";
        if (bh) {
          bh.innerText = "Factor: 1.0 Safe";
          bh.className = "text-[10px] font-bold text-emerald-400 uppercase";
        }
        document.getElementById("val-vessel").innerText = "Ambient";
        document.getElementById("val-rpm").innerText = "0 RPM";
      }

      if (scourFill) scourFill.style.height = factor * 100 + "%";

      sensorChart.data.datasets[0].data.shift();
      sensorChart.data.datasets[0].data.push(turb);
      sensorChart.update("none");

      depthChart.data.datasets[0].data.shift();
      depthChart.data.datasets[0].data.push(dep);
      depthChart.update("none");

      bridgeChart.data.datasets[0].data.shift();
      bridgeChart.data.datasets[0].data.push(factor);
      bridgeChart.update("none");
    });
}
setInterval(updateDashboard, 300);
setInterval(() => {
  document.getElementById("real-time-clock").innerText = new Date().toLocaleTimeString();
}, 1000);
