from flask import Flask, render_template, request, jsonify
import os

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

latest_data = {
    "Turbidity": 0,
    "Vibration": 0,
    "Depth": 0,
    "Tilt": 0,
    "DetectVibration": False,
    "Latitude": 0,
    "Longitude": 0
}

@app.route("/data", methods=['POST'])
def receive_data():
    global latest_data
    payload = request.get_json()
    if payload:
        latest_data.update(payload)
    return jsonify({"status": "success"}), 200

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/latest", methods=["GET"])
def get_latest():
    return jsonify(latest_data)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
