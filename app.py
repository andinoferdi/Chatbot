from flask import Flask, render_template, request, jsonify
import requests
import json
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

API_KEY = os.getenv("OPENROUTER_API_KEY")
API_URL = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

SESSIONS_FILE = "data/chat_sessions.json"

if not os.path.exists("data"):
    os.makedirs("data")

if not os.path.exists(SESSIONS_FILE):
    with open(SESSIONS_FILE, "w") as file:
        json.dump({}, file)

def load_chat_sessions():
    try:
        with open(SESSIONS_FILE, "r") as file:
            return json.load(file)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}

def save_chat_sessions(sessions):
    with open(SESSIONS_FILE, "w") as file:
        json.dump(sessions, file, indent=4)

@app.route("/new_session", methods=["GET"])
def new_session():
    session_id = str(uuid.uuid4())  
    chat_sessions = load_chat_sessions()
    chat_sessions[session_id] = []  
    save_chat_sessions(chat_sessions)
    return jsonify({"session_id": session_id})

@app.route("/get_history/<session_id>", methods=["GET"])
def get_history(session_id):
    chat_sessions = load_chat_sessions()
    return jsonify({"history": chat_sessions.get(session_id, [])})

@app.route("/get_sessions", methods=["GET"])
def get_sessions():
    chat_sessions = load_chat_sessions()
    return jsonify({"sessions": list(chat_sessions.keys())})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    session_id = data.get("session_id")
    user_message = data.get("message")

    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400

    chat_sessions = load_chat_sessions()

    if session_id not in chat_sessions:
        chat_sessions[session_id] = []

    chat_sessions[session_id].append({"role": "user", "content": user_message})

    payload = {
        "model": "openai/gpt-3.5-turbo",
        "messages": chat_sessions[session_id]
    }

    response = requests.post(API_URL, headers=headers, data=json.dumps(payload))

    if response.status_code == 200:
        api_response = response.json()
        
        if "choices" in api_response and len(api_response["choices"]) > 0:
            bot_response = api_response["choices"][0]["message"]["content"]
        else:
            bot_response = "Sorry, there was an error retrieving a response from AI."

        chat_sessions[session_id].append({"role": "assistant", "content": bot_response})
        save_chat_sessions(chat_sessions)
        return jsonify({"response": bot_response})
    else:
        return jsonify({"error": f"Error {response.status_code}: {response.text}"}), response.status_code

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
