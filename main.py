from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from functools import wraps
import mysql.connector
import os
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    # SESSION_COOKIE_SECURE=True,  # enable when serving over HTTPS
)

CORS(
    app,
    supports_credentials=True,
    origins=["http://127.0.0.1:5000", "http://localhost:5000"],
)


# ===================================
# DATABASE CONNECTION
# ===================================
def get_db():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="ApexAlpha@1406",
        database="drone_command",
    )


# ===================================
# AUTH GUARD
# ===================================
def require_login(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "not authenticated"}), 401
        return fn(*args, **kwargs)
    return wrapper


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
# LOGIN (POST, JSON body, server-side session)
# ===================================
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"success": False, "error": "missing credentials"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM users WHERE username = %s AND password = %s",
        (username, password),
    )
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user:
        return jsonify({"success": False, "error": "invalid credentials"}), 401

    session.clear()
    session["user_id"] = user.get("id", user["username"])
    session["username"] = user["username"]
    session["full_name"] = user.get("full_name")
    session["role"] = user.get("role")

    return jsonify({
        "success": True,
        "username": user["username"],
        "full_name": user.get("full_name"),
        "role": user.get("role"),
    })


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/me")
def me():
    if not session.get("user_id"):
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "username": session.get("username"),
        "full_name": session.get("full_name"),
        "role": session.get("role"),
    })


# ===================================
# DRONE RECOMMENDATION (protected)
# ===================================
@app.route("/drones/recommend")
@require_login
def recommend():
    drone_type    = request.args.get("type")
    range_km      = request.args.get("range_km", type=float)
    endurance_hrs = request.args.get("endurance_hrs", type=float)
    payload_kg    = request.args.get("payload_kg", type=float)
    stealth_level = request.args.get("stealth_level")
    strike_mode   = request.args.get("strike_mode")
    delivery_mode = request.args.get("delivery_mode")

    query = "SELECT * FROM drones WHERE drone_type = %s"
    params = [drone_type]

    if range_km is not None:
        query += " AND range_km >= %s"
        params.append(range_km)
    if endurance_hrs is not None:
        query += " AND endurance_hrs >= %s"
        params.append(endurance_hrs)
    if payload_kg is not None:
        query += " AND payload_kg >= %s"
        params.append(payload_kg)
    if stealth_level:
        query += " AND stealth_level = %s"
        params.append(stealth_level)
    if strike_mode:
        query += " AND strike_mode = %s"
        params.append(strike_mode)
    if delivery_mode:
        query += " AND delivery_mode = %s"
        params.append(delivery_mode)

    query += " ORDER BY range_km ASC LIMIT 1"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, tuple(params))
    drone = cursor.fetchone()
    cursor.close()
    conn.close()

    return jsonify(drone or {})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)