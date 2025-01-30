document.addEventListener("DOMContentLoaded", function () {
  const chatBox = document.getElementById("chat-box");
  const userInput = document.getElementById("user-input");
  const sessionList = document.getElementById("session-list");
  const newChatButton = document.getElementById("new-chat-btn"); // Ensure the button exists in HTML

  let currentSession = null;
  let sessionNames = {};

  function fetchSessions() {
    fetch("/get_sessions")
      .then((response) => response.json())
      .then((data) => {
        sessionList.innerHTML = "";
        data.sessions.forEach((session) => {
          let listItem = document.createElement("li");
          let sessionName = sessionNames[session] || "New Chat";
          listItem.textContent = sessionName;
          listItem.onclick = () => loadSession(session);
          sessionList.appendChild(listItem);
        });
      })
      .catch((error) => console.error("Error fetching sessions:", error));
  }

  window.createNewSession = function () {
    fetch("/new_session")
      .then((response) => response.json())
      .then((data) => {
        currentSession = data.session_id;
        chatBox.innerHTML = "";
        sessionNames[currentSession] = "New Chat";
        fetchSessions();
      })
      .catch((error) => console.error("Error creating session:", error));
  };

  function loadSession(sessionId) {
    currentSession = sessionId;
    fetch(`/get_history/${sessionId}`) // FIXED STRING INTERPOLATION
      .then((response) => response.json())
      .then((data) => {
        chatBox.innerHTML = "";
        if (data.history.length > 0) {
          sessionNames[sessionId] =
            data.history[0].content.slice(0, 20) + "...";
        }
        data.history.forEach((msg) => appendMessage(msg.role, msg.content));
        fetchSessions();
      })
      .catch((error) => console.error("Error loading session:", error));
  }

  window.sendMessage = function () {
    if (!currentSession) {
      alert("Please start a new chat session first.");
      return;
    }

    const message = userInput.value.trim();
    if (message === "") return;

    appendMessage("user", message);
    userInput.value = "";

    const typingIndicator = document.createElement("div");
    typingIndicator.classList.add("bot-message", "typing-indicator");
    typingIndicator.innerText = "AI is typing...";
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;

    fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: currentSession, message: message }),
    })
      .then((response) => response.json())
      .then((data) => {
        chatBox.removeChild(typingIndicator);
        if (data.response) {
          appendMessage("bot", data.response);
          sessionNames[currentSession] = message.slice(0, 20) + "...";
        } else {
          appendMessage("bot", "Sorry, an error occurred.");
        }
        fetchSessions();
      })
      .catch((error) => {
        chatBox.removeChild(typingIndicator);
        console.error("Error:", error);
        appendMessage("bot", "Error communicating with the server.");
      });
  };

  window.handleKeyPress = function (event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  function appendMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.classList.add(
      sender === "user" ? "user-message" : "bot-message"
    );
    messageElement.innerText = text;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  if (newChatButton) {
    newChatButton.onclick = createNewSession;
  }

  fetchSessions();
});
