from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

# ===================================
# DATABASE CONNECTION
# ===================================
def get_db():
    conn = mysql.connector.connect(
        host="localhost",
        user="root",        
        password="ApexAlpha@1406",        
        database="drone_command"
    )
    return conn

# ===================================
# SERVE FRONTEND FILES
# ===================================
@app.route("/")
def home():
    return send_from_directory("html", "brief.html")

@app.route("/<path:filename>")
def serve_file(filename):
    if filename.endswith(".html"):
        return send_from_directory("html", filename)
    elif filename.startswith("css/"):
        return send_from_directory(".", filename)
    elif filename.startswith("assets/"):
        return send_from_directory(".", filename)
    else:
        return send_from_directory(".", filename)

# ===================================
# LOGIN
# ===================================
@app.route("/login")
def login():
    username = request.args.get("username")
    password = request.args.get("password")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM users WHERE username = %s AND password = %s",
        (username, password)
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if user:
        return jsonify({
            "success": True,
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"]
        })
    else:
        return jsonify({"success": False, "message": "Invalid credentials"})

# ===================================
# GET ALL DRONES BY TYPE
# ===================================
@app.route("/drones")
def get_drones():
    type = request.args.get("type")
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM drones WHERE type = %s", (type,))
    drones = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(drones)

# ===================================
# RECOMMEND DRONE
# ===================================
@app.route("/drones/recommend")
def recommend_drone():
    type          = request.args.get("type", "")
    range_km      = int(request.args.get("range_km", 0))
    payload_kg    = int(request.args.get("payload_kg", 0))
    endurance_hrs = float(request.args.get("endurance_hrs", 0))
    stealth_level = request.args.get("stealth_level", "")
    strike_mode   = request.args.get("strike_mode", "")
    delivery_mode = request.args.get("delivery_mode", "")

    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT * FROM drones
        WHERE type = %s
        AND range_km >= %s
        AND payload_kg >= %s
        AND endurance_hrs >= %s
    """
    params = [type, range_km, payload_kg, endurance_hrs]

    if stealth_level:
        query += " AND stealth_level = %s"
        params.append(stealth_level)
    if strike_mode:
        query += " AND strike_mode = %s"
        params.append(strike_mode)
    if delivery_mode:
        query += " AND delivery_mode = %s"
        params.append(delivery_mode)

    query += " ORDER BY FIELD(drone_condition, 'optimal', 'good', 'damaged', 'under_maintenance') LIMIT 1"

    cursor.execute(query, tuple(params))
    drone = cursor.fetchone()
    cursor.close()
    conn.close()

    if drone:
        return jsonify(drone)
    else:
        return jsonify({"message": "No drone found matching these parameters"})

# ===================================
# RUN SERVER
# ===================================
if __name__ == "__main__":
    app.run(debug=True)