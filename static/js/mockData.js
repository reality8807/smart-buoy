function generateSensorData() {
    const isMining = Math.random() > 0.85;
    const timeFactor = Date.now() * 0.001;
    const noise = (Math.sin(timeFactor) + Math.cos(timeFactor * 0.7)) * 3;
    return {
        Turbidity: isMining ? (1200 + Math.random() * 800).toFixed(0) : (40 + noise + (Math.random() * 5)).toFixed(1),
        Vibration: isMining ? (32 + Math.random() * 12).toFixed(2) : (0.6 + (Math.random() * 0.5) + (noise / 15)).toFixed(2),
        Depth: isMining ? (15 + Math.random() * 20).toFixed(1) : "0.0",
        Tilt: (1.5 + (noise / 2) + Math.random()).toFixed(1)
    };
}