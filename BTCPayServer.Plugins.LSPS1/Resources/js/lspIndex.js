document.addEventListener("DOMContentLoaded", () => {
  console.log("LSPS1 plugin: DOM fully loaded");
  const connectButton = document.getElementById("lsps-connect");

  if (connectButton) {
    console.log("LSPS1 plugin: Connect button found, attaching event listener");
    connectButton.addEventListener("click", connectToLightningServiceProvider);
  } else {
    console.warn("LSPS1 plugin: Connect button not found");
  }
});

async function connectToLightningServiceProvider(event) {
  console.log("LSPS1 plugin: Connect button clicked");
  const statusEl = document.getElementById("status-message");
  statusEl.textContent = "Connecting…";
  statusEl.className = "ms-3 text-muted";

  try {
    const storeId = document.getElementById("store-id").value;
    const token = document.getElementById("request-verification-token").value;

    console.log(`LSPS1 plugin: Connecting to LSP for store ${storeId}`);

    if (!storeId) {
      console.error("LSPS1 plugin: No store ID found");
    }

    const res = await fetch(
      `/stores/${storeId}/plugins/lsps1/get-info-connect`,
      {
        method: "POST",
        headers: { RequestVerificationToken: token },
      }
    );

    console.log("LSPS1 plugin: Response received", res.status);

    const { ok, msg } = await res.json();
    console.log(
      `LSPS1 plugin: LSP connection ${ok ? "successful" : "failed"}`,
      msg
    );

    statusEl.textContent = msg;
    statusEl.className = ok ? "ms-3 text-success" : "ms-3 text-danger";
  } catch (err) {
    console.error("LSPS1 plugin: Error connecting to LSP", err);
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "ms-3 text-danger";
  }
}
