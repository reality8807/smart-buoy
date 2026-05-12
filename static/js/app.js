function switchView(viewId) {
    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    document.querySelectorAll('.content-view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-btn-v2').forEach(b => b.classList.remove('active'));

    if (viewId === 'landing') {
        document.getElementById('view-landing').classList.remove('hidden');
    } else {
        document.getElementById('app-shell').classList.remove('hidden');
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        document.getElementById(`nav-${viewId}`).classList.add('active');
        if (viewId === 'forensics') populateForensics();
        if (viewId === 'dna' && dnaChart) dnaChart.update();
    }
    lucide.createIcons();
}

// SIM ENGINE
let simCharts = {};
function initSim() {
    const opts = (lY) => ({ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true, title: {display: true, text: 'TIME', color: '#f59e0b', font: {size: 8}} , grid: { display: false } }, y: { display: true, title: { display: true, text: lY, color: '#f59e0b', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 8 } } } } });
    simCharts.turb = new Chart(document.getElementById('simChartTurb'), { type: 'line', data: { labels: Array(30).fill(''), datasets: [{ borderColor: '#22d3ee', data: Array(30).fill(40), fill: true, pointRadius: 0 }] }, options: opts('NTU') });
    simCharts.vib = new Chart(document.getElementById('simChartVib'), { type: 'line', data: { labels: Array(30).fill(''), datasets: [{ borderColor: '#fbbf24', data: Array(30).fill(1), pointRadius: 0 }] }, options: opts('HZ') });
    simCharts.delta = new Chart(document.getElementById('simChartDelta'), { type: 'bar', data: { labels: Array(30).fill(''), datasets: [{ backgroundColor: '#3b82f6', data: Array(30).fill(0) }] }, options: opts('CM') });

    let simCycle = 0;
    setInterval(() => {
        if (document.getElementById('view-sim').classList.contains('hidden')) return;
        simCycle++;
        const isMining = (simCycle % 10 > 5);
        const view = document.getElementById('view-sim');
        const label = document.getElementById('sim-status-label');
        if (isMining) { view.classList.add('mining-sim-active'); label.innerText = "CRITICAL: Extraction Detected"; } 
        else { view.classList.remove('mining-sim-active'); label.innerText = "Normal Hydraulics"; }
        const simData = generateSensorData();
        const vals = [isMining ? simData.Turbidity : 40, isMining ? simData.Vibration : 0.5, isMining ? simData.Depth : 0];
        [simCharts.turb, simCharts.vib, simCharts.delta].forEach((c, i) => {
            c.data.datasets[0].data.shift();
            c.data.datasets[0].data.push(vals[i]);
            c.update('none');
        });
    }, 1500);
}

// VESSEL DNA
let dnaChart;
function initDNA() {
    const ctx = document.getElementById('dnaChart');
    if(!ctx) return;
    dnaChart = new Chart(ctx.getContext('2d'), {
        type: 'radar',
        data: { labels: ['Low Freq', 'Mechanical', 'Impulse', 'Cavitation', 'Rhythm'], datasets: [{ label: 'DNA', data: [10, 5, 2, 8, 12], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.2)' }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#ffffff' }, ticks: { display: false } } } }
    });
    setInterval(() => {
        if (document.getElementById('view-dna').classList.contains('hidden')) return;
        const isM = document.getElementById('alert-card').classList.contains('mining-alert');
        document.getElementById('dna-match').innerText = isM ? "94%" : "2%";
        document.getElementById('dna-name').innerText = isM ? "DREDGE DETECTED" : "SCANNING...";
        dnaChart.data.datasets[0].data = isM ? [85, 90, 70, 80, 95] : [10, 5, 12, 8, 15];
        dnaChart.update();
    }, 2000);
}

// SONAR & FORENSICS
function initSonar() {
    const canvas = document.getElementById('waterfallCanvas'); if (!canvas) return;
    const ctx = canvas.getContext('2d'); canvas.width = 800; canvas.height = 1000;
    function render() {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height - 4); ctx.putImageData(imgData, 0, 4);
        const isMining = document.getElementById('alert-card').classList.contains('mining-alert');
        for (let x = 0; x < canvas.width; x += 10) {
            let s = Math.random();
            if (isMining && (Math.abs(x - 300) < 30 || Math.abs(x - 600) < 30)) { ctx.fillStyle = `rgba(245,158,11,${Math.random() * 0.8 + 0.2})`; }
            else { ctx.fillStyle = `rgba(34, 211, 238, ${s * 0.15})`; }
            ctx.fillRect(x, 0, 8, 4);
        }
        requestAnimationFrame(render);
    }
    render();
}

function populateForensics() {
    const tableBody = document.getElementById('forensic-table'); if (!tableBody) return;
    const SENSING_AREA = 12.5; const MARKET_RATE = 2850;
    const forensicData = [{ time: "04:12 AM", type: "Industrial Dredge", delta: 32.4 }, { time: "01:25 AM", type: "Suction Pump", delta: 18.2 }, { time: "Yesterday 11:15 PM", type: "Mechanical Scoop", delta: 11.5 }];
    tableBody.innerHTML = forensicData.map(log => {
        const loss = (log.delta / 100) * SENSING_AREA * MARKET_RATE;
        return `<tr class="hover:bg-amber-500/10 transition border-b border-white/5"><td class="p-8 text-white/50 font-mono text-sm">${log.time}</td><td class="p-8 text-amber-500 font-black uppercase tracking-wider">${log.type}</td><td class="p-8 font-bold text-2xl text-white">${log.delta}cm</td><td class="p-8 text-emerald-400 font-bold text-2xl">₹${Math.floor(loss).toLocaleString('en-IN')}</td><td class="p-8 font-mono text-[11px] text-amber-500/40">0x${Math.random().toString(16).substr(2, 10).toUpperCase()}</td></tr>`;
    }).join('');
}

// REPORT GENERATOR
function generateDossier() {
    const initial = document.getElementById('report-initial');
    const loading = document.getElementById('report-loading');
    const scanLine = document.getElementById('scan-line-effect');
    initial.classList.add('hidden');
    loading.classList.remove('hidden');
    scanLine.classList.remove('hidden');
    setTimeout(() => {
        scanLine.classList.add('hidden');
        loading.innerHTML = `
            <div class="text-left animate-in fade-in duration-1000 w-full">
                <h4 class="text-amber-500 font-black mb-6 uppercase tracking-widest text-xl">Dossier #SENTINEL-992-B</h4>
                <div class="grid grid-cols-2 gap-10">
                    <div class="space-y-4"><p class="text-xs uppercase opacity-40">Profile</p><p class="text-3xl font-bold uppercase">Dredge Verified</p><p class="text-xs uppercase opacity-40 mt-4">Calculated Loss</p><p class="text-3xl font-bold text-red-500">₹1,12,450</p></div>
                    <div class="space-y-4"><p class="text-xs uppercase opacity-40">Node Status</p><p class="text-3xl font-bold">ALPHA-01 LOCK</p><p class="text-xs uppercase opacity-40 mt-4">Evidence Hash</p><p class="text-sm font-mono text-amber-500 truncate">SHA256: 7F2...D92L</p></div>
                </div>
                <button onclick="window.print()" class="mt-12 btn-titan-primary py-4 w-full">Download Forensic PDF</button>
            </div>`;
    }, 3500);
}

window.onload = () => { initSim(); initSonar(); initDNA(); populateForensics(); };
