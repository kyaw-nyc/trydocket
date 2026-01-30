document.getElementById("send").addEventListener("click", () => {
  const prompt = document.getElementById("prompt").value.trim();
  if (!prompt) return;
  chrome.runtime.sendMessage({ type: "ping" }, (res) => {
    document.getElementById("result").textContent = `Sent: ${prompt}\nPing response: ${JSON.stringify(res)}`;
  });
});
