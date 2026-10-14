
const internetButton = document.getElementById("internetButton");
const siteButton = document.getElementById("siteButton");

function updateStatus(state, title, message) {
    document.getElementById("statusDot").className =
        "dot" + (state === true ? " ok" : state === false ? " error" : "");

    document.getElementById("statusTitle").textContent = title;
    document.getElementById("statusMessage").textContent = message;
}

async function requestJSON(url) {
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Erreur HTTP " + response.status);
    }

    return data;
}

internetButton.addEventListener("click", async () => {
    internetButton.disabled = true;
    updateStatus(null, "Test en cours…", "Vérification depuis le serveur.");

    try {
        const data = await requestJSON("/api/internet");

        document.getElementById("googleResult").textContent =
            data.checks.google.ok
                ? "Accessible · " + data.checks.google.ms + " ms"
                : "Échec";

        document.getElementById("cloudflareResult").textContent =
            data.checks.cloudflare.ok
                ? "Accessible · " + data.checks.cloudflare.ms + " ms"
                : "Échec";

        document.getElementById("lastTest").textContent =
            new Date(data.time).toLocaleString("fr-FR");

        updateStatus(
            data.ok,
            data.ok ? "Internet accessible" : "Internet non confirmé",
            data.ok
                ? "Au moins un service externe répond depuis le serveur."
                : "Aucun service testé n'a répondu. Vérifie le réseau et le DNS."
        );
    } catch (error) {
        updateStatus(false, "Erreur", error.message);
    } finally {
        internetButton.disabled = false;
    }
});

siteButton.addEventListener("click", async () => {
    const address = document.getElementById("siteUrl").value.trim();
    const result = document.getElementById("siteResult");

    if (!address) {
        result.textContent = "Saisis une adresse Web.";
        return;
    }

    siteButton.disabled = true;
    result.textContent = "Test du site en cours…";

    try {
        const data = await requestJSON(
            "/api/site?url=" + encodeURIComponent(address)
        );

        result.textContent = data.ok
            ? "✅ Le site répond. Code HTTP : " + data.status
                + " · Temps : " + data.ms + " ms"
            : "❌ Le site ne répond pas : " + data.error;
    } catch (error) {
        result.textContent = "Erreur : " + error.message;
    } finally {
        siteButton.disabled = false;
    }
});
