/* global Chart, fetch, document, window */

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
      const turb = parseFloat(data.Turbidity); // || 35 + Math.random() * 5
      const vib = parseFloat(data.Vibration); //  || 0.2 + Math.random() * 0.4
      const dep = parseFloat(data.Depth) || 0;
      const rawLat = parseFloat(data.Latitude);
      const rawLng = parseFloat(data.Longitude);

      const lat = isNaN(rawLat) || rawLat === 0 ? 12.9245 : rawLat;
      const lng = isNaN(rawLng) || rawLng === 0 ? 77.4996 : rawLng;

      const pitch = parseFloat(data.Pitch) || 0;
      const roll = parseFloat(data.Roll) || 0;

      document.getElementById("val-turbidity").innerText = turb.toFixed(1);
      document.getElementById("val-vibration").innerText = vib.toFixed(2);
      document.getElementById("val-depth").innerText = dep.toFixed(2);
      
      const valGpsEl = document.getElementById("val-gps");
      if (valGpsEl) {
        valGpsEl.innerText = `[${lat.toFixed(6)}, ${lng.toFixed(6)}] FIXED`;
      }
      
      window['currentGps'] = [lat, lng];

      // Dynamic baseline depth calibration
      if (typeof window['baselineDepth'] === 'undefined') {
        window['baselineDepth'] = null;
      }
      if (window['baselineDepth'] === null && dep >= 20 && dep <= 300) {
        window['baselineDepth'] = dep;
      }

      // Sub-Probability Calculations:
      // A. Turbidity (Clean water: 500-600 NTU, Muddy water: >= 600 NTU)
      const pTurb = Math.min(1.0, Math.max(0.0, (turb - 600) / 200));

      // B. Depth delta (Excavation)
      let pDep = 0.0;
      if (window['baselineDepth'] !== null) {
        const depthDelta = dep - window['baselineDepth'];
        pDep = Math.min(1.0, Math.max(0.0, (depthDelta - 2) / 8));
      }

      // C. Vibration (Peak-to-Peak quiet ~100-300, pumps/engines >= 1000)
      const pVib = Math.min(1.0, Math.max(0.0, (vib - 400) / 1600));

      // D. Tilt (Pitch & Roll baseline quiet < 5 deg, heavy rocking >= 25 deg)
      const maxTilt = Math.max(Math.abs(pitch), Math.abs(roll));
      const pTilt = Math.min(1.0, Math.max(0.0, (maxTilt - 5) / 20));

      // Combined Weighted Mining Probability
      const pMining = (0.40 * pTurb) + (0.35 * pDep) + (0.15 * pVib) + (0.10 * pTilt);
      const isMining = pMining > 0.50;
      const probPct = Math.round(pMining * 100);

      const card = document.getElementById("alert-card");
      const bh = document.getElementById("bridge-health");
      const scourFill = document.getElementById("scour-fill");

      const factor = isMining ? Math.max(0.4, 1.0 - dep / 50) : 1.0;

      // Handle card styling classes and text updates
      if (card) {
        card.classList.remove("border-emerald-500", "border-amber-500", "border-red-500", "mining-alert");
        const lblStatus = document.getElementById("lbl-status");
        const valStatus = document.getElementById("val-status");
        const lblProbability = document.getElementById("lbl-probability");
        const valProbability = document.getElementById("val-probability");

        const elementsToColor = [lblStatus, valStatus, lblProbability, valProbability];
        elementsToColor.forEach(el => {
          if (el) el.classList.remove("text-emerald-400", "text-amber-500", "text-red-500");
        });

        if (valProbability) {
          valProbability.innerText = `${probPct}%`;
        }

        if (pMining <= 0.20) {
          card.classList.add("border-emerald-500");
          elementsToColor.forEach(el => {
            if (el) el.classList.add("text-emerald-400");
          });
          if (valStatus) valStatus.innerText = "SECURE";
          
          document.getElementById("val-vessel").innerText = "Ambient";
          document.getElementById("val-rpm").innerText = "0 RPM";
          if (bh) {
            bh.innerText = "Factor: 1.0 Safe";
            bh.className = "text-[10px] font-bold text-emerald-400 uppercase";
          }
        } else if (pMining <= 0.50) {
          card.classList.add("border-amber-500");
          elementsToColor.forEach(el => {
            if (el) el.classList.add("text-amber-500");
          });
          if (valStatus) valStatus.innerText = "SUSPICIOUS";
          
          document.getElementById("val-vessel").innerText = "Unusual Activity";
          document.getElementById("val-rpm").innerText = "800 RPM";
          if (bh) {
            bh.innerText = `Factor: ${factor.toFixed(2)} Warning`;
            bh.className = "text-[10px] font-bold text-amber-500 uppercase";
          }
        } else {
          card.classList.add("border-red-500", "mining-alert");
          elementsToColor.forEach(el => {
            if (el) el.classList.add("text-red-500");
          });
          if (valStatus) valStatus.innerText = "DETECTED";
          
          document.getElementById("val-vessel").innerText = "Dredge Detected";
          document.getElementById("val-rpm").innerText = "1840 RPM";
          if (bh) {
            bh.innerText = `Factor: ${factor.toFixed(2)} Danger`;
            bh.className = "text-[10px] font-bold text-red-500 uppercase";
          }
        }
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



      const waveEnergy = parseFloat(data.WaveEnergy) || 0;

      // Update the 3D buoy model rotation
      const buoyModel = document.getElementById("buoy-3d-model");
      const bobbingWrapper = document.getElementById("buoy-bobbing-wrapper");
      const tiltLabel = document.getElementById("val-tilt-deg");

      if (buoyModel) {
        // Cap visual tilt at 45° for display — beyond that it looks broken
        const displayPitch = Math.min(Math.max(pitch, -45), 45);
        const displayRoll = Math.min(Math.max(roll, -45), 45);

        // Rotate on X axis for pitch, and Y axis for roll
        buoyModel.style.transform = `rotateX(${displayPitch}deg) rotateY(${displayRoll}deg)`;
        buoyModel.style.transition = "transform 0.5s ease-out";
      }

      if (bobbingWrapper) {
        // Add wave bobbing animation when rocking
        if (data.IsRocking || Math.abs(pitch) > 15 || Math.abs(roll) > 15) {
          bobbingWrapper.style.animation = "buoyWave 1s ease-in-out infinite alternate";
        } else {
          bobbingWrapper.style.animation = "buoyFloat 3s infinite ease-in-out";
        }
      }

      if (tiltLabel) {
        const maxTilt = Math.max(Math.abs(pitch), Math.abs(roll));
        const status = maxTilt > 30 ? "⚠ TAMPER" : maxTilt > 15 ? "ROCKING" : "STABLE";
        tiltLabel.innerText = `PITCH: ${pitch.toFixed(1)}° | ROLL: ${roll.toFixed(1)}° — ${status}`;
        tiltLabel.className = maxTilt > 30 ? "mt-8 font-mono text-red-400 font-bold" : maxTilt > 15 ? "mt-8 font-mono text-amber-400" : "mt-8 font-mono text-cyan-400";
      }
    });
}
setInterval(updateDashboard, 500); //2000 initially
setInterval(() => {
  document.getElementById("real-time-clock").innerText = new Date().toLocaleTimeString();
}, 1000);
