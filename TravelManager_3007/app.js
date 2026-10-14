"use strict";

/* =========================================================
   TRAVEL MANAGER 3007
   ========================================================= */

const STORAGE_KEY = "travelManager3007_v3";

let db = loadDatabase();

let calendarDate = new Date();

let editing = {
  type: null,
  id: null
};


/* =========================================================
   DATABASE
   ========================================================= */

function defaultDatabase() {
  return {
    version: 3,

    theme: "light",

    trips: [],

    countdowns: [],

    activities: [],

    events: [],

    transports: [],

    bags: [],

    bagItems: [],

    packing: [],

    expenses: [],

    bookings: [],

    documents: [],

    notes: [],

    checklists: [],

    travelers: [],

    internet: null,

    settings: {
      currency: "EUR"
    }
  };
}

function loadDatabase() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultDatabase();
    }

    const parsed = JSON.parse(raw);

    return {
      ...defaultDatabase(),
      ...parsed
    };
  } catch {
    return defaultDatabase();
  }
}

function saveDatabase() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(db)
  );
}


/* =========================================================
   UTILITIES
   ========================================================= */

function uid() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateTime(date) {
  if (!date) return "—";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} €`;
}

function escapeICS(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function toast(message, type = "success") {
  const container =
    document.getElementById("toastContainer");

  const item = document.createElement("div");

  item.className = `toast ${type}`;
  item.textContent = message;

  container.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 3500);
}

function downloadFile(name, content, type) {
  const blob = new Blob(
    [content],
    { type }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = name;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}


/* =========================================================
   NAVIGATION
   ========================================================= */

document.querySelectorAll(".navButton")
  .forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

function showPage(page) {
  document.querySelectorAll(".page")
    .forEach((element) => {
      element.classList.remove("active");
    });

  document
    .getElementById(`page-${page}`)
    ?.classList.add("active");

  document.querySelectorAll(".navButton")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

  renderAll();
}


/* =========================================================
   THEME
   ========================================================= */

function applyTheme() {
  document.documentElement.dataset.theme =
    db.theme === "dark" ? "dark" : "light";

  const button =
    document.getElementById("themeButton");

  if (button) {
    button.textContent =
      db.theme === "dark" ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  db.theme =
    db.theme === "dark" ? "light" : "dark";

  saveDatabase();
  applyTheme();
}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(title, content) {
  document.getElementById("modalTitle").textContent = title;

  document.getElementById("modalContent").innerHTML =
    content;

  document.getElementById("modal")
    .classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal")
    .classList.add("hidden");

  editing.type = null;
  editing.id = null;
}


/* =========================================================
   TRIPS
   ========================================================= */

function openTripModal(id = null) {
  editing.type = "trip";
  editing.id = id;

  const trip = id
    ? db.trips.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier le voyage" : "Nouveau voyage",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Nom du voyage</label>
          <input id="tripName" value="${escapeHTML(trip?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Destination principale</label>
          <input id="tripDestination" value="${escapeHTML(trip?.destination || "")}">
        </div>

        <div class="formGroup">
          <label>Départ</label>
          <input
            id="tripStart"
            type="datetime-local"
            value="${trip?.start || ""}"
          >
        </div>

        <div class="formGroup">
          <label>Retour</label>
          <input
            id="tripEnd"
            type="datetime-local"
            value="${trip?.end || ""}"
          >
        </div>

        <div class="formGroup">
          <label>Icône</label>
          <input id="tripIcon" value="${escapeHTML(trip?.icon || "✈️")}">
        </div>

        <div class="formGroup">
          <label>Statut</label>

          <select id="tripStatus">
            ${[
              "Préparation",
              "Confirmé",
              "En cours",
              "Terminé",
              "Annulé"
            ].map((x) =>
              `<option ${trip?.status === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup full">
          <label>Notes</label>
          <textarea id="tripNotes">${escapeHTML(trip?.notes || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">

        <button onclick="closeModal()">
          Annuler
        </button>

        <button class="primary" onclick="saveTrip()">
          Enregistrer
        </button>

      </div>
    `
  );
}

function saveTrip() {
  const name =
    document.getElementById("tripName").value.trim();

  if (!name) {
    toast("Le nom du voyage est obligatoire", "error");
    return;
  }

  const existing = editing.id
    ? db.trips.find((x) => x.id === editing.id)
    : null;

  const trip = existing || {
    id: uid(),
    createdAt: new Date().toISOString()
  };

  trip.name = name;
  trip.destination =
    document.getElementById("tripDestination").value.trim();

  trip.start =
    document.getElementById("tripStart").value;

  trip.end =
    document.getElementById("tripEnd").value;

  trip.icon =
    document.getElementById("tripIcon").value || "✈️";

  trip.status =
    document.getElementById("tripStatus").value;

  trip.notes =
    document.getElementById("tripNotes").value;

  if (!existing) {
    db.trips.push(trip);

    /*
     * Compte à rebours AUTOMATIQUE.
     *
     * Il est créé avec la date de départ.
     * Ensuite l'utilisateur peut modifier son compteur
     * sans modifier la date du voyage.
     */
    if (trip.start) {
      db.countdowns.push({
        id: uid(),
        tripId: trip.id,
        name: `Départ — ${trip.name}`,
        icon: "⏱️",
        target: trip.start,
        description: "Compte à rebours automatique"
      });
    }
  }

  saveDatabase();
  closeModal();
  renderAll();

  toast(
    existing
      ? "Voyage modifié"
      : "Voyage créé + compte à rebours ajouté"
  );
}

function deleteTrip(id) {
  if (!confirm("Supprimer ce voyage et ses éléments liés ?")) {
    return;
  }

  db.trips =
    db.trips.filter((x) => x.id !== id);

  db.countdowns =
    db.countdowns.filter((x) => x.tripId !== id);

  db.activities =
    db.activities.filter((x) => x.tripId !== id);

  db.transports =
    db.transports.filter((x) => x.tripId !== id);

  db.bags =
    db.bags.filter((x) => x.tripId !== id);

  db.packing =
    db.packing.filter((x) => x.tripId !== id);

  db.expenses =
    db.expenses.filter((x) => x.tripId !== id);

  db.bookings =
    db.bookings.filter((x) => x.tripId !== id);

  db.documents =
    db.documents.filter((x) => x.tripId !== id);

  db.notes =
    db.notes.filter((x) => x.tripId !== id);

  saveDatabase();
  renderAll();

  toast("Voyage supprimé");
}


/* =========================================================
   COUNTDOWNS
   ========================================================= */

function openCountdownModal(id = null) {
  editing.type = "countdown";
  editing.id = id;

  const countdown = id
    ? db.countdowns.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier le compteur" : "Nouveau compteur",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Nom</label>
          <input
            id="countdownName"
            value="${escapeHTML(countdown?.name || "")}"
          >
        </div>

        <div class="formGroup">
          <label>Icône</label>
          <input
            id="countdownIcon"
            value="${escapeHTML(countdown?.icon || "⏱️")}"
          >
        </div>

        <div class="formGroup full">
          <label>Date cible</label>

          <input
            id="countdownTarget"
            type="datetime-local"
            value="${countdown?.target || ""}"
          >

          <small>
            Modifier ce compteur ne modifie jamais la date
            de départ du voyage.
          </small>
        </div>

        <div class="formGroup full">
          <label>Description</label>
          <textarea id="countdownDescription">${escapeHTML(countdown?.description || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">

        <button onclick="closeModal()">
          Annuler
        </button>

        <button class="primary" onclick="saveCountdown()">
          Enregistrer
        </button>

      </div>
    `
  );
}

function saveCountdown() {
  const existing = editing.id
    ? db.countdowns.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.name =
    document.getElementById("countdownName").value;

  item.icon =
    document.getElementById("countdownIcon").value || "⏱️";

  item.target =
    document.getElementById("countdownTarget").value;

  item.description =
    document.getElementById("countdownDescription").value;

  if (!existing) {
    db.countdowns.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();

  toast("Compte à rebours enregistré");
}

function deleteCountdown(id) {
  if (!confirm("Supprimer ce compteur ?")) return;

  db.countdowns =
    db.countdowns.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}

function countdownText(target) {
  const diff =
    new Date(target).getTime() - Date.now();

  if (Number.isNaN(diff)) {
    return "Date invalide";
  }

  if (diff <= 0) {
    return "🚀 Échéance atteinte";
  }

  const seconds =
    Math.floor(diff / 1000);

  const days =
    Math.floor(seconds / 86400);

  const hours =
    Math.floor((seconds % 86400) / 3600);

  const minutes =
    Math.floor((seconds % 3600) / 60);

  const secs =
    seconds % 60;

  return `${days} j ${hours} h ${minutes} min ${secs} s`;
}


/* =========================================================
   ACTIVITIES
   ========================================================= */

function openActivityModal(id = null) {
  editing.type = "activity";
  editing.id = id;

  const item = id
    ? db.activities.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier l'activité" : "Nouvelle activité",
    `
      <div class="formGrid">

        <div class="formGroup full">
          <label>Voyage</label>
          <select id="activityTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Activité</label>
          <input
            id="activityName"
            value="${escapeHTML(item?.name || "")}"
          >
        </div>

        <div class="formGroup">
          <label>Lieu</label>
          <input
            id="activityPlace"
            value="${escapeHTML(item?.place || "")}"
          >
        </div>

        <div class="formGroup">
          <label>Date / heure</label>
          <input
            id="activityDate"
            type="datetime-local"
            value="${item?.date || ""}"
          >
        </div>

        <div class="formGroup">
          <label>Durée</label>
          <input
            id="activityDuration"
            placeholder="2h"
            value="${escapeHTML(item?.duration || "")}"
          >
        </div>

        <div class="formGroup full">
          <label>Notes</label>
          <textarea id="activityNotes">${escapeHTML(item?.notes || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveActivity()">Enregistrer</button>
      </div>
    `
  );
}

function saveActivity() {
  const existing = editing.id
    ? db.activities.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.tripId =
    document.getElementById("activityTrip").value;

  item.name =
    document.getElementById("activityName").value;

  item.place =
    document.getElementById("activityPlace").value;

  item.date =
    document.getElementById("activityDate").value;

  item.duration =
    document.getElementById("activityDuration").value;

  item.notes =
    document.getElementById("activityNotes").value;

  if (!existing) {
    db.activities.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteActivity(id) {
  if (!confirm("Supprimer cette activité ?")) return;

  db.activities =
    db.activities.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   CALENDAR
   ========================================================= */

function changeMonth(delta) {
  calendarDate.setMonth(
    calendarDate.getMonth() + delta
  );

  renderCalendar();
}

function openEventModal(id = null) {
  editing.type = "event";
  editing.id = id;

  const item = id
    ? db.events.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier l'événement" : "Nouvel événement",
    `
      <div class="formGrid">

        <div class="formGroup full">
          <label>Titre</label>
          <input
            id="eventName"
            value="${escapeHTML(item?.name || "")}"
          >
        </div>

        <div class="formGroup">
          <label>Date</label>
          <input
            id="eventDate"
            type="date"
            value="${item?.date || ""}"
          >
        </div>

        <div class="formGroup">
          <label>Heure</label>
          <input
            id="eventTime"
            type="time"
            value="${item?.time || ""}"
          >
        </div>

        <div class="formGroup full">
          <label>Description</label>
          <textarea id="eventDescription">${escapeHTML(item?.description || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveEvent()">Enregistrer</button>
      </div>
    `
  );
}

function saveEvent() {
  const existing = editing.id
    ? db.events.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.name =
    document.getElementById("eventName").value;

  item.date =
    document.getElementById("eventDate").value;

  item.time =
    document.getElementById("eventTime").value;

  item.description =
    document.getElementById("eventDescription").value;

  if (!existing) {
    db.events.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}


/* =========================================================
   TRANSPORT
   ========================================================= */

function openTransportModal(id = null) {
  editing.type = "transport";
  editing.id = id;

  const item = id
    ? db.transports.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier le trajet" : "Nouveau trajet",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="transportTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Type</label>

          <select id="transportType">
            ${[
              "Vol",
              "Train",
              "Bus",
              "Voiture",
              "Taxi / VTC",
              "Bateau",
              "Autre"
            ].map((x) =>
              `<option ${item?.type === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Compagnie</label>
          <input id="transportCompany" value="${escapeHTML(item?.company || "")}">
        </div>

        <div class="formGroup">
          <label>Numéro</label>
          <input id="transportNumber" value="${escapeHTML(item?.number || "")}">
        </div>

        <div class="formGroup">
          <label>Départ</label>
          <input id="transportFrom" value="${escapeHTML(item?.from || "")}">
        </div>

        <div class="formGroup">
          <label>Arrivée</label>
          <input id="transportTo" value="${escapeHTML(item?.to || "")}">
        </div>

        <div class="formGroup">
          <label>Date / heure départ</label>
          <input id="transportDeparture" type="datetime-local" value="${item?.departure || ""}">
        </div>

        <div class="formGroup">
          <label>Date / heure arrivée</label>
          <input id="transportArrival" type="datetime-local" value="${item?.arrival || ""}">
        </div>

        <div class="formGroup">
          <label>Terminal</label>
          <input id="transportTerminal" value="${escapeHTML(item?.terminal || "")}">
        </div>

        <div class="formGroup">
          <label>Porte / quai</label>
          <input id="transportGate" value="${escapeHTML(item?.gate || "")}">
        </div>

        <div class="formGroup">
          <label>Siège</label>
          <input id="transportSeat" value="${escapeHTML(item?.seat || "")}">
        </div>

        <div class="formGroup">
          <label>Référence / PNR</label>
          <input id="transportReference" value="${escapeHTML(item?.reference || "")}">
        </div>

        <div class="formGroup full">
          <label>Notes</label>
          <textarea id="transportNotes">${escapeHTML(item?.notes || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveTransport()">Enregistrer</button>
      </div>
    `
  );
}

function saveTransport() {
  const existing = editing.id
    ? db.transports.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.tripId =
    document.getElementById("transportTrip").value;

  item.type =
    document.getElementById("transportType").value;

  item.company =
    document.getElementById("transportCompany").value;

  item.number =
    document.getElementById("transportNumber").value;

  item.from =
    document.getElementById("transportFrom").value;

  item.to =
    document.getElementById("transportTo").value;

  item.departure =
    document.getElementById("transportDeparture").value;

  item.arrival =
    document.getElementById("transportArrival").value;

  item.terminal =
    document.getElementById("transportTerminal").value;

  item.gate =
    document.getElementById("transportGate").value;

  item.seat =
    document.getElementById("transportSeat").value;

  item.reference =
    document.getElementById("transportReference").value;

  item.notes =
    document.getElementById("transportNotes").value;

  if (!existing) {
    db.transports.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteTransport(id) {
  if (!confirm("Supprimer ce trajet ?")) return;

  db.transports =
    db.transports.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   BAGS
   ========================================================= */

function openBagModal(id = null) {
  editing.type = "bag";
  editing.id = id;

  const bag = id
    ? db.bags.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier le bagage" : "Nouveau bagage",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="bagTrip">
            ${tripOptions(bag?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Type</label>

          <select id="bagType">
            ${[
              "Soute",
              "Valise",
              "Cabine",
              "Sac personnel",
              "Sac informatique",
              "Sac photo",
              "Sac sport",
              "Sac enfant",
              "Autre"
            ].map((x) =>
              `<option ${bag?.type === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Nom</label>
          <input id="bagName" value="${escapeHTML(bag?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Poids maximal (kg)</label>
          <input id="bagMaxWeight" type="number" step="0.1" value="${bag?.maxWeight || ""}">
        </div>

        <div class="formGroup">
          <label>Poids actuel (kg)</label>
          <input id="bagWeight" type="number" step="0.1" value="${bag?.weight || 0}">
        </div>

        <div class="formGroup">
          <label>Longueur (cm)</label>
          <input id="bagLength" type="number" value="${bag?.length || ""}">
        </div>

        <div class="formGroup">
          <label>Largeur (cm)</label>
          <input id="bagWidth" type="number" value="${bag?.width || ""}">
        </div>

        <div class="formGroup">
          <label>Hauteur (cm)</label>
          <input id="bagHeight" type="number" value="${bag?.height || ""}">
        </div>

        <div class="formGroup full">
          <label>Notes</label>
          <textarea id="bagNotes">${escapeHTML(bag?.notes || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveBag()">Enregistrer</button>
      </div>
    `
  );
}

function saveBag() {
  const existing = editing.id
    ? db.bags.find((x) => x.id === editing.id)
    : null;

  const bag = existing || {
    id: uid()
  };

  bag.tripId =
    document.getElementById("bagTrip").value;

  bag.type =
    document.getElementById("bagType").value;

  bag.name =
    document.getElementById("bagName").value ||
    bag.type;

  bag.maxWeight =
    Number(document.getElementById("bagMaxWeight").value || 0);

  bag.weight =
    Number(document.getElementById("bagWeight").value || 0);

  bag.length =
    Number(document.getElementById("bagLength").value || 0);

  bag.width =
    Number(document.getElementById("bagWidth").value || 0);

  bag.height =
    Number(document.getElementById("bagHeight").value || 0);

  bag.notes =
    document.getElementById("bagNotes").value;

  if (!existing) {
    db.bags.push(bag);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteBag(id) {
  if (!confirm("Supprimer ce bagage ?")) return;

  db.bags =
    db.bags.filter((x) => x.id !== id);

  db.bagItems =
    db.bagItems.filter((x) => x.bagId !== id);

  saveDatabase();
  renderAll();
}

function openBagItemModal(bagId) {
  editing.type = "bagItem";
  editing.id = null;

  openModal(
    "Ajouter un objet au bagage",
    `
      <div class="formGrid">

        <div class="formGroup full">
          <label>Bagage</label>

          <select id="bagItemBag">
            ${db.bags.map((bag) => `
              <option value="${bag.id}" ${bag.id === bagId ? "selected" : ""}>
                ${escapeHTML(bag.name)} — ${escapeHTML(bag.type)}
              </option>
            `).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Objet</label>
          <input id="bagItemName" placeholder="T-shirt, chargeur, chaussures...">
        </div>

        <div class="formGroup">
          <label>Quantité</label>
          <input id="bagItemQuantity" type="number" value="1" min="1">
        </div>

        <div class="formGroup">
          <label>Poids unitaire (kg)</label>
          <input id="bagItemWeight" type="number" step="0.01" value="0">
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveBagItem()">Ajouter</button>
      </div>
    `
  );
}

function saveBagItem() {
  const item = {
    id: uid(),

    bagId:
      document.getElementById("bagItemBag").value,

    name:
      document.getElementById("bagItemName").value,

    quantity:
      Number(document.getElementById("bagItemQuantity").value || 1),

    unitWeight:
      Number(document.getElementById("bagItemWeight").value || 0)
  };

  if (!item.name) {
    toast("Indique le nom de l'objet", "error");
    return;
  }

  db.bagItems.push(item);

  recalculateBags();

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteBagItem(id) {
  db.bagItems =
    db.bagItems.filter((x) => x.id !== id);

  recalculateBags();

  saveDatabase();
  renderAll();
}

function recalculateBags() {
  for (const bag of db.bags) {
    const items =
      db.bagItems.filter(
        (x) => x.bagId === bag.id
      );

    const itemWeight =
      items.reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0) *
          Number(item.unitWeight || 0),
        0
      );

    bag.calculatedWeight = itemWeight;
  }
}


/* =========================================================
   PACKING
   ========================================================= */

function openPackingModal(id = null) {
  editing.type = "packing";
  editing.id = id;

  const item = id
    ? db.packing.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier l'élément" : "Ajouter à la valise",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="packingTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Catégorie</label>

          <select id="packingCategory">
            ${[
              "Vêtements",
              "Toilette",
              "Électronique",
              "Documents",
              "Chaussures",
              "Accessoires",
              "Autre"
            ].map((x) =>
              `<option ${item?.category === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Objet</label>
          <input id="packingName" value="${escapeHTML(item?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Quantité</label>
          <input id="packingQuantity" type="number" value="${item?.quantity || 1}" min="1">
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="savePacking()">Enregistrer</button>
      </div>
    `
  );
}

function savePacking() {
  const existing = editing.id
    ? db.packing.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid(),
    done: false
  };

  item.tripId =
    document.getElementById("packingTrip").value;

  item.category =
    document.getElementById("packingCategory").value;

  item.name =
    document.getElementById("packingName").value;

  item.quantity =
    Number(document.getElementById("packingQuantity").value || 1);

  if (!existing) {
    db.packing.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function togglePacking(id) {
  const item =
    db.packing.find((x) => x.id === id);

  if (!item) return;

  item.done = !item.done;

  saveDatabase();
  renderAll();
}

function deletePacking(id) {
  db.packing =
    db.packing.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}

function clearCompletedPacking() {
  db.packing =
    db.packing.filter((x) => !x.done);

  saveDatabase();
  renderAll();
}

function addPackingTemplate() {
  const template = [
    ["Vêtements", "T-shirts", 5],
    ["Vêtements", "Pantalon", 2],
    ["Vêtements", "Sous-vêtements", 7],
    ["Vêtements", "Chaussettes", 7],
    ["Toilette", "Brosse à dents", 1],
    ["Toilette", "Dentifrice", 1],
    ["Toilette", "Savon", 1],
    ["Électronique", "Chargeur téléphone", 1],
    ["Électronique", "Batterie externe", 1],
    ["Électronique", "Adaptateur", 1],
    ["Documents", "Pièce d'identité", 1],
    ["Documents", "Réservations", 1],
    ["Accessoires", "Lunettes", 1]
  ];

  for (const [category, name, quantity] of template) {
    db.packing.push({
      id: uid(),
      tripId: db.trips[0]?.id || "",
      category,
      name,
      quantity,
      done: false
    });
  }

  saveDatabase();
  renderAll();

  toast("Checklist de voyage ajoutée");
}


/* =========================================================
   BUDGET
   ========================================================= */

function openExpenseModal(id = null) {
  editing.type = "expense";
  editing.id = id;

  const item = id
    ? db.expenses.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier la dépense" : "Nouvelle dépense",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="expenseTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Catégorie</label>

          <select id="expenseCategory">
            ${[
              "Transport",
              "Hébergement",
              "Alimentation",
              "Activité",
              "Shopping",
              "Assurance",
              "Autre"
            ].map((x) =>
              `<option ${item?.category === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Description</label>
          <input id="expenseName" value="${escapeHTML(item?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Montant (€)</label>
          <input id="expenseAmount" type="number" step="0.01" value="${item?.amount || ""}">
        </div>

        <div class="formGroup">
          <label>Date</label>
          <input id="expenseDate" type="date" value="${item?.date || ""}">
        </div>

        <div class="formGroup">
          <label>Payé par</label>
          <input id="expensePerson" value="${escapeHTML(item?.person || "")}">
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveExpense()">Enregistrer</button>
      </div>
    `
  );
}

function saveExpense() {
  const existing = editing.id
    ? db.expenses.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.tripId =
    document.getElementById("expenseTrip").value;

  item.category =
    document.getElementById("expenseCategory").value;

  item.name =
    document.getElementById("expenseName").value;

  item.amount =
    Number(document.getElementById("expenseAmount").value || 0);

  item.date =
    document.getElementById("expenseDate").value;

  item.person =
    document.getElementById("expensePerson").value;

  if (!existing) {
    db.expenses.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteExpense(id) {
  db.expenses =
    db.expenses.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   BOOKINGS
   ========================================================= */

function openBookingModal(id = null) {
  editing.type = "booking";
  editing.id = id;

  const item = id
    ? db.bookings.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier la réservation" : "Nouvelle réservation",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="bookingTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Type</label>

          <select id="bookingType">
            ${[
              "Vol",
              "Hôtel",
              "Train",
              "Voiture",
              "Bus",
              "Restaurant",
              "Activité",
              "Autre"
            ].map((x) =>
              `<option ${item?.type === x ? "selected" : ""}>${x}</option>`
            ).join("")}
          </select>
        </div>

        <div class="formGroup">
          <label>Nom</label>
          <input id="bookingName" value="${escapeHTML(item?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Référence</label>
          <input id="bookingReference" value="${escapeHTML(item?.reference || "")}">
        </div>

        <div class="formGroup">
          <label>Date</label>
          <input id="bookingDate" type="datetime-local" value="${item?.date || ""}">
        </div>

        <div class="formGroup">
          <label>Prix</label>
          <input id="bookingPrice" type="number" step="0.01" value="${item?.price || ""}">
        </div>

        <div class="formGroup full">
          <label>Lien</label>
          <input id="bookingUrl" type="url" value="${escapeHTML(item?.url || "")}">
        </div>

        <div class="formGroup full">
          <label>Notes</label>
          <textarea id="bookingNotes">${escapeHTML(item?.notes || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveBooking()">Enregistrer</button>
      </div>
    `
  );
}

function saveBooking() {
  const existing = editing.id
    ? db.bookings.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.tripId =
    document.getElementById("bookingTrip").value;

  item.type =
    document.getElementById("bookingType").value;

  item.name =
    document.getElementById("bookingName").value;

  item.reference =
    document.getElementById("bookingReference").value;

  item.date =
    document.getElementById("bookingDate").value;

  item.price =
    Number(document.getElementById("bookingPrice").value || 0);

  item.url =
    document.getElementById("bookingUrl").value;

  item.notes =
    document.getElementById("bookingNotes").value;

  if (!existing) {
    db.bookings.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteBooking(id) {
  db.bookings =
    db.bookings.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   DOCUMENTS
   ========================================================= */

function openDocumentModal(id = null) {
  editing.type = "document";
  editing.id = id;

  const item = id
    ? db.documents.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier le document" : "Nouveau document",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Voyage</label>
          <select id="documentTrip">
            ${tripOptions(item?.tripId)}
          </select>
        </div>

        <div class="formGroup">
          <label>Type</label>
          <select id="documentType">
            <option>Identité</option>
            <option>Réservation</option>
            <option>Assurance</option>
            <option>Billet</option>
            <option>Autre</option>
          </select>
        </div>

        <div class="formGroup full">
          <label>Nom</label>
          <input id="documentName" value="${escapeHTML(item?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Référence</label>
          <input id="documentReference" value="${escapeHTML(item?.reference || "")}">
        </div>

        <div class="formGroup">
          <label>Date d'expiration</label>
          <input id="documentExpiry" type="date" value="${item?.expiry || ""}">
        </div>

        <div class="formGroup full">
          <label>Lien</label>
          <input id="documentUrl" type="url" value="${escapeHTML(item?.url || "")}">
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveDocument()">Enregistrer</button>
      </div>
    `
  );
}

function saveDocument() {
  const existing = editing.id
    ? db.documents.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.tripId =
    document.getElementById("documentTrip").value;

  item.type =
    document.getElementById("documentType").value;

  item.name =
    document.getElementById("documentName").value;

  item.reference =
    document.getElementById("documentReference").value;

  item.expiry =
    document.getElementById("documentExpiry").value;

  item.url =
    document.getElementById("documentUrl").value;

  if (!existing) {
    db.documents.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteDocument(id) {
  db.documents =
    db.documents.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   NOTES
   ========================================================= */

function openNoteModal(id = null) {
  editing.type = "note";
  editing.id = id;

  const item = id
    ? db.notes.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier la note" : "Nouvelle note",
    `
      <div class="formGrid">

        <div class="formGroup full">
          <label>Titre</label>
          <input id="noteTitle" value="${escapeHTML(item?.title || "")}">
        </div>

        <div class="formGroup full">
          <label>Contenu</label>
          <textarea id="noteContent">${escapeHTML(item?.content || "")}</textarea>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveNote()">Enregistrer</button>
      </div>
    `
  );
}

function saveNote() {
  const existing = editing.id
    ? db.notes.find((x) => x.id === editing.id)
    : null;

  const item = existing || {
    id: uid()
  };

  item.title =
    document.getElementById("noteTitle").value;

  item.content =
    document.getElementById("noteContent").value;

  item.updatedAt =
    new Date().toISOString();

  if (!existing) {
    db.notes.push(item);
  }

  saveDatabase();
  closeModal();
  renderAll();
}

function deleteNote(id) {
  db.notes =
    db.notes.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   CHECKLISTS
   ========================================================= */

function openChecklistModal(id = null) {
  editing.type = "checklist";
  editing.id = id;

  const item = id
    ? db.checklists.find((x) => x.id === id)
    : null;

  openModal(
    id ? "Modifier la checklist" : "Nouvelle checklist",
    `
      <div class="formGrid">

        <div class="formGroup">
          <label>Nom</label>
          <input id="checklistName" value="${escapeHTML(item?.name || "")}">
        </div>

        <div class="formGroup">
          <label>Type</label>

          <select id="checklistType">
            <option>Pré-départ</option>
            <option>Maison</option>
            <option>Aéroport</option>
            <option>Personnalisée</option>
          </select>
        </div>

      </div>

      <div class="modalActions">
        <button onclick="closeModal()">Annuler</button>
        <button class="primary" onclick="saveChecklist()">Créer</button>
      </div>
    `
  );
}

function saveChecklist() {
  const item = {
    id: uid(),

    name:
      document.getElementById("checklistName").value,

    type:
      document.getElementById("checklistType").value,

    items: []
  };

  if (!item.name) {
    toast("Nom obligatoire", "error");
    return;
  }

  db.checklists.push(item);

  saveDatabase();
  closeModal();
  renderAll();
}

function addChecklistTemplate(type) {
  const templates = {
    airport: [
      "Vérifier le billet",
      "Vérifier le passeport / identité",
      "Vérifier les bagages",
      "Arriver suffisamment tôt",
      "Passer les contrôles",
      "Vérifier la porte",
      "Vérifier l'embarquement"
    ],

    home: [
      "Fermer les fenêtres",
      "Vérifier les portes",
      "Éteindre les appareils inutiles",
      "Vérifier les prises",
      "Vérifier les plantes",
      "Prendre les clés"
    ],

    departure: [
      "Téléphone chargé",
      "Chargeurs",
      "Documents",
      "Billets",
      "Bagages",
      "Portefeuille",
      "Clés"
    ]
  };

  const names = {
    airport: "Départ aéroport",
    home: "Maison avant départ",
    departure: "Préparation du départ"
  };

  db.checklists.push({
    id: uid(),
    name: names[type],
    type,
    items: templates[type].map((name) => ({
      id: uid(),
      name,
      done: false
    }))
  });

  saveDatabase();
  renderAll();
}

function toggleChecklistItem(checklistId, itemId) {
  const list =
    db.checklists.find((x) => x.id === checklistId);

  const item =
    list?.items.find((x) => x.id === itemId);

  if (!item) return;

  item.done = !item.done;

  saveDatabase();
  renderAll();
}

function addChecklistItem(id) {
  const list =
    db.checklists.find((x) => x.id === id);

  if (!list) return;

  const name =
    prompt("Nom du nouvel élément :");

  if (!name) return;

  list.items.push({
    id: uid(),
    name,
    done: false
  });

  saveDatabase();
  renderAll();
}

function deleteChecklist(id) {
  db.checklists =
    db.checklists.filter((x) => x.id !== id);

  saveDatabase();
  renderAll();
}


/* =========================================================
   INTERNET
   ========================================================= */

async function checkInternet(showToast = false) {
  const dashboard =
    document.getElementById("internetDashboard");

  const big =
    document.getElementById("internetBigState");

  if (dashboard) {
    dashboard.innerHTML = `
      <div class="internetState warning">
        <span class="statusDot"></span>
        <strong>Test Internet en cours...</strong>
      </div>
    `;
  }

  if (big) {
    big.innerHTML = `
      <span class="bigInternetIcon">🔄</span>
      <h3>Vérification en cours...</h3>
      <p>Le serveur contacte réellement Internet.</p>
    `;
  }

  try {
    const started = performance.now();

    const response =
      await fetch(
        `/api/internet-check?time=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

    const elapsed =
      Math.round(performance.now() - started);

    if (!response.ok) {
      throw new Error(
        `Serveur HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    result.browserRoundTrip = elapsed;

    db.internet = result;

    saveDatabase();

    renderInternet(result);

    if (showToast) {
      toast(
        result.internet
          ? `Internet OK — ${result.latency} ms`
          : "Internet inaccessible",
        result.internet ? "success" : "error"
      );
    }

    return result;
  } catch (error) {
    const result = {
      internet: false,
      testedAt: new Date().toISOString(),
      successfulTests: 0,
      totalTests: 0,
      latency: null,
      tests: [],
      error: error.message
    };

    db.internet = result;

    saveDatabase();

    renderInternet(result);

    if (showToast) {
      toast(
        "Impossible de contacter le serveur",
        "error"
      );
    }

    return result;
  }
}

function renderInternet(result) {
  const dashboard =
    document.getElementById("internetDashboard");

  const big =
    document.getElementById("internetBigState");

  const tests =
    document.getElementById("internetTests");

  if (!result) return;

  const online = result.internet;

  if (dashboard) {
    dashboard.innerHTML = `
      <div class="internetState ${online ? "online" : "offline"}">
        <span class="statusDot"></span>

        <strong>
          ${online ? "Internet accessible" : "Internet inaccessible"}
        </strong>
      </div>

      <p>
        ${result.successfulTests}/${result.totalTests}
        tests Internet réussis.
        ${
          result.latency !== null
            ? `Latence minimale : ${result.latency} ms.`
            : ""
        }
      </p>

      <small>
        Dernière vérification :
        ${formatDateTime(result.testedAt)}
      </small>

      <br><br>

      <button class="primary" onclick="checkInternet(true)">
        🔄 Tester à nouveau
      </button>
    `;
  }

  if (big) {
    big.innerHTML = `
      <span class="bigInternetIcon">
        ${online ? "🌐" : "🚫"}
      </span>

      <h3>
        ${online
          ? "Internet fonctionne"
          : "Internet inaccessible"}
      </h3>

      <p>
        ${result.successfulTests}/${result.totalTests}
        connexions externes réussies.
      </p>

      ${
        result.latency !== null
          ? `<p>Latence minimale : <strong>${result.latency} ms</strong></p>`
          : ""
      }

      <small>
        ${formatDateTime(result.testedAt)}
      </small>
    `;
  }

  if (tests) {
    tests.innerHTML =
      result.tests.map((test) => `
        <div class="onlineTest">

          <strong>
            ${test.ok ? "🟢" : "🔴"}
            ${escapeHTML(test.name)}
          </strong>

          <br>

          ${
            test.ok
              ? `<span class="testSuccess">
                  Connexion réussie — ${test.latency} ms
                 </span>`
              : `<span class="testFail">
                  Échec — ${escapeHTML(test.error || "Erreur")}
                 </span>`
          }

        </div>
      `).join("");
  }
}


/* =========================================================
   ONLINE WEATHER
   ========================================================= */

async function searchWeather() {
  const place =
    document.getElementById("weatherPlace")
      .value.trim();

  const result =
    document.getElementById("weatherResult");

  if (!place) {
    toast("Indique une destination", "warning");
    return;
  }

  if (!db.internet?.internet) {
    toast(
      "Vérifie d'abord Internet avec le bouton dédié.",
      "warning"
    );
    return;
  }

  result.innerHTML =
    "<p>Recherche de la destination...</p>";

  try {
    const geoResponse =
      await fetch(
        `/api/geocode?q=${encodeURIComponent(place)}`
      );

    const geo =
      await geoResponse.json();

    if (!geo.ok || !geo.results?.length) {
      throw new Error("Destination introuvable");
    }

    const destination =
      geo.results[0];

    const weatherResponse =
      await fetch(
        `/api/weather?lat=${destination.latitude}&lon=${destination.longitude}`
      );

    const weather =
      await weatherResponse.json();

    if (!weather.ok) {
      throw new Error(weather.error);
    }

    const current =
      weather.data.current;

    const daily =
      weather.data.daily;

    result.innerHTML = `
      <div class="weatherCurrent">

        <strong>
          ${escapeHTML(destination.name)}
        </strong>

        <h2>
          ${current.temperature_2m} °C
        </h2>

        <p>
          Ressenti :
          ${current.apparent_temperature} °C
        </p>

        <div class="miniGrid">

          <div class="miniStat">
            <small>Humidité</small>
            ${current.relative_humidity_2m} %
          </div>

          <div class="miniStat">
            <small>Vent</small>
            ${current.wind_speed_10m} km/h
          </div>

          <div class="miniStat">
            <small>Pluie</small>
            ${current.precipitation} mm
          </div>

        </div>

        <hr>

        <p>
          Maximum aujourd'hui :
          ${daily.temperature_2m_max[0]} °C
        </p>

        <p>
          Minimum :
          ${daily.temperature_2m_min[0]} °C
        </p>

        <a
          href="https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}"
          target="_blank"
          rel="noopener"
        >
          🗺️ Ouvrir dans Google Maps
        </a>

      </div>
    `;
  } catch (error) {
    result.innerHTML =
      `<p class="testFail">${escapeHTML(error.message)}</p>`;
  }
}


/* =========================================================
   GEOCODING / MAP
   ========================================================= */

async function searchPlace() {
  const place =
    document.getElementById("mapPlace")
      .value.trim();

  const result =
    document.getElementById("mapResult");

  if (!place) return;

  if (!db.internet?.internet) {
    toast(
      "Vérifie d'abord Internet.",
      "warning"
    );
    return;
  }

  result.innerHTML =
    "<p>Recherche...</p>";

  try {
    const response =
      await fetch(
        `/api/geocode?q=${encodeURIComponent(place)}`
      );

    const data =
      await response.json();

    if (!data.ok || !data.results.length) {
      throw new Error("Aucun résultat");
    }

    result.innerHTML =
      data.results.map((item) => `
        <div class="itemCard" style="margin-top:10px">

          <strong>
            ${escapeHTML(item.name)}
          </strong>

          <p>
            ${item.latitude},
            ${item.longitude}
          </p>

          <a
            href="https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}"
            target="_blank"
            rel="noopener"
          >
            🗺️ Ouvrir dans Google Maps
          </a>

        </div>
      `).join("");
  } catch (error) {
    result.innerHTML =
      `<p class="testFail">${escapeHTML(error.message)}</p>`;
  }
}


/* =========================================================
   SERVER STATUS
   ========================================================= */

async function loadServerStatus() {
  const element =
    document.getElementById("serverInfo");

  if (!element) return;

  try {
    const response =
      await fetch("/api/status");

    const data =
      await response.json();

    element.innerHTML = `
      <div class="miniGrid">

        <div class="miniStat">
          <small>Application</small>
          ${escapeHTML(data.application)}
        </div>

        <div class="miniStat">
          <small>Node.js</small>
          ${escapeHTML(data.node)}
        </div>

        <div class="miniStat">
          <small>Plateforme</small>
          ${escapeHTML(data.platform)}
        </div>

      </div>
    `;
  } catch {
    element.textContent =
      "Serveur inaccessible.";
  }
}


/* =========================================================
   EXPORT / IMPORT
   ========================================================= */

function exportJSON() {
  downloadFile(
    "travel-manager-backup.json",
    JSON.stringify(db, null, 2),
    "application/json"
  );

  toast("Sauvegarde JSON exportée");
}

document
  .getElementById("importFile")
  .addEventListener("change", async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    try {
      const text =
        await file.text();

      const imported =
        JSON.parse(text);

      db = {
        ...defaultDatabase(),
        ...imported
      };

      saveDatabase();
      renderAll();

      toast("Sauvegarde importée");
    } catch {
      toast("Fichier JSON invalide", "error");
    }

    event.target.value = "";
  });

function csvEscape(value) {
  return `"${String(value ?? "")
    .replaceAll('"', '""')}"`;
}

function exportCSV() {
  const rows = [
    ["Type", "Nom", "Date", "Information"]
  ];

  for (const trip of db.trips) {
    rows.push([
      "Voyage",
      trip.name,
      trip.start,
      trip.destination
    ]);
  }

  for (const expense of db.expenses) {
    rows.push([
      "Dépense",
      expense.name,
      expense.date,
      expense.amount
    ]);
  }

  for (const booking of db.bookings) {
    rows.push([
      "Réservation",
      booking.name,
      booking.date,
      booking.reference
    ]);
  }

  const csv =
    rows
      .map((row) =>
        row.map(csvEscape).join(";")
      )
      .join("\n");

  downloadFile(
    "travel-manager.csv",
    "\ufeff" + csv,
    "text/csv;charset=utf-8"
  );

  toast("CSV exporté");
}

function printPage() {
  window.print();
}


/* =========================================================
   ICS
   ========================================================= */

function exportICS() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Travel Manager 3007//FR"
  ];

  for (const trip of db.trips) {
    if (!trip.start) continue;

    const start =
      toICSDate(trip.start);

    const end =
      toICSDate(
        trip.end || trip.start
      );

    lines.push(
      "BEGIN:VEVENT",
      `UID:${trip.id}@travelmanager3007`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeICS(trip.icon + " " + trip.name)}`,
      `LOCATION:${escapeICS(trip.destination)}`,
      "END:VEVENT"
    );
  }

  for (const event of db.events) {
    if (!event.date) continue;

    const date =
      event.date.replaceAll("-", "");

    const time =
      (event.time || "00:00")
        .replace(":", "") + "00";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@travelmanager3007`,
      `DTSTART:${date}T${time}`,
      `SUMMARY:${escapeICS(event.name)}`,
      `DESCRIPTION:${escapeICS(event.description)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  downloadFile(
    "travel-manager.ics",
    lines.join("\r\n"),
    "text/calendar;charset=utf-8"
  );

  toast("Calendrier ICS exporté");
}

function toICSDate(value) {
  const d = new Date(value);

  const pad =
    (n) => String(n).padStart(2, "0");

  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}


/* =========================================================
   DUPLICATE TRIP
   ========================================================= */

function duplicateCurrentTrip() {
  if (!db.trips.length) {
    toast("Aucun voyage à dupliquer", "warning");
    return;
  }

  const names =
    db.trips
      .map(
        (trip, index) =>
          `${index + 1}. ${trip.name}`
      )
      .join("\n");

  const choice =
    prompt(
      `Quel voyage dupliquer ?\n\n${names}`
    );

  const index =
    Number(choice) - 1;

  const original =
    db.trips[index];

  if (!original) return;

  const copy = {
    ...original,
    id: uid(),
    name: `${original.name} — Copie`,
    createdAt: new Date().toISOString()
  };

  db.trips.push(copy);

  saveDatabase();
  renderAll();

  toast("Voyage dupliqué");
}


/* =========================================================
   RESET
   ========================================================= */

function resetDemoData() {
  if (
    !confirm(
      "Remplacer les données actuelles par des données de démonstration ?"
    )
  ) {
    return;
  }

  db = defaultDatabase();

  const start =
    new Date();

  start.setDate(
    start.getDate() + 20
  );

  const end =
    new Date(start);

  end.setDate(
    end.getDate() + 7
  );

  const trip = {
    id: uid(),
    name: "Voyage à Paris",
    destination: "Paris, France",
    start: start.toISOString().slice(0, 16),
    end: end.toISOString().slice(0, 16),
    icon: "🇫🇷",
    status: "Préparation",
    notes: "Voyage de démonstration.",
    createdAt: new Date().toISOString()
  };

  db.trips.push(trip);

  db.countdowns.push({
    id: uid(),
    tripId: trip.id,
    name: "Départ pour Paris",
    icon: "✈️",
    target: trip.start,
    description: "Compte à rebours automatique"
  });

  db.activities.push({
    id: uid(),
    tripId: trip.id,
    name: "Visite de Paris",
    place: "Paris",
    date: trip.start,
    duration: "1 journée",
    notes: "Exemple d'activité."
  });

  db.bags.push({
    id: uid(),
    tripId: trip.id,
    type: "Cabine",
    name: "Valise cabine",
    maxWeight: 8,
    weight: 5.5,
    length: 55,
    width: 40,
    height: 20,
    notes: ""
  });

  addPackingTemplate();

  db.expenses.push({
    id: uid(),
    tripId: trip.id,
    category: "Transport",
    name: "Billet",
    amount: 80,
    date: start.toISOString().slice(0, 10),
    person: ""
  });

  saveDatabase();
  renderAll();

  toast("Données de démonstration restaurées");
}

function resetEverything() {
  if (
    !confirm(
      "ATTENTION : supprimer toutes les données de Travel Manager ?"
    )
  ) {
    return;
  }

  db = defaultDatabase();

  saveDatabase();
  renderAll();

  toast("Toutes les données ont été supprimées");
}


/* =========================================================
   RENDER HELPERS
   ========================================================= */

function tripOptions(selected = "") {
  if (!db.trips.length) {
    return `<option value="">Aucun voyage</option>`;
  }

  return db.trips.map((trip) => `
    <option
      value="${trip.id}"
      ${trip.id === selected ? "selected" : ""}
    >
      ${escapeHTML(trip.icon)} ${escapeHTML(trip.name)}
    </option>
  `).join("");
}

function tripName(id) {
  return (
    db.trips.find((x) => x.id === id)?.name ||
    "Sans voyage"
  );
}


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard() {
  document.getElementById("statTrips").textContent =
    db.trips.length;

  document.getElementById("statCountdowns").textContent =
    db.countdowns.length;

  document.getElementById("statBags").textContent =
    db.bags.length;

  const total =
    db.expenses.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  document.getElementById("statBudget").textContent =
    money(total);

  const dashboardTrips =
    document.getElementById("dashboardTrips");

  const upcoming =
    [...db.trips]
      .filter((x) => x.start)
      .sort(
        (a, b) =>
          new Date(a.start) -
          new Date(b.start)
      )
      .slice(0, 6);

  dashboardTrips.innerHTML =
    upcoming.length
      ? upcoming.map(tripCard).join("")
      : `<div class="empty">Aucun voyage.</div>`;

  const next =
    [...db.countdowns]
      .filter(
        (x) =>
          new Date(x.target).getTime() > Date.now()
      )
      .sort(
        (a, b) =>
          new Date(a.target) -
          new Date(b.target)
      )[0];

  const nextElement =
    document.getElementById("nextCountdown");

  if (!next) {
    nextElement.innerHTML =
      `<div class="empty">Aucun départ prochain.</div>`;
  } else {
    nextElement.innerHTML = `
      <div class="countdownNumber">
        ${countdownText(next.target)}
      </div>

      <strong>
        ${escapeHTML(next.icon)}
        ${escapeHTML(next.name)}
      </strong>

      <p>
        ${formatDateTime(next.target)}
      </p>
    `;
  }

  if (db.internet) {
    renderInternet(db.internet);
  }
}

function tripCard(trip) {
  return `
    <article class="itemCard">

      <div class="badge">
        ${escapeHTML(trip.status)}
      </div>

      <h3>
        ${escapeHTML(trip.icon)}
        ${escapeHTML(trip.name)}
      </h3>

      <p>
        📍 ${escapeHTML(trip.destination)}
      </p>

      <p>
        🗓️ ${formatDate(trip.start)}
        →
        ${formatDate(trip.end)}
      </p>

      <div class="actions">

        <button onclick="openTripModal('${trip.id}')">
          Modifier
        </button>

        <button onclick="deleteTrip('${trip.id}')">
          Supprimer
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER TRIPS
   ========================================================= */

function renderTrips() {
  const element =
    document.getElementById("tripList");

  element.innerHTML =
    db.trips.length
      ? db.trips.map(tripCard).join("")
      : `<div class="empty">Aucun voyage. Crée ton premier voyage.</div>`;
}


/* =========================================================
   RENDER COUNTDOWNS
   ========================================================= */

function renderCountdowns() {
  const element =
    document.getElementById("countdownList");

  element.innerHTML =
    db.countdowns.length
      ? db.countdowns.map((item) => `
        <article class="itemCard">

          <div class="badge">
            ${escapeHTML(tripName(item.tripId))}
          </div>

          <h3>
            ${escapeHTML(item.icon)}
            ${escapeHTML(item.name)}
          </h3>

          <div class="countdownNumber">
            ${countdownText(item.target)}
          </div>

          <p>
            Cible :
            ${formatDateTime(item.target)}
          </p>

          <p>
            ${escapeHTML(item.description)}
          </p>

          <div class="actions">

            <button onclick="openCountdownModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteCountdown('${item.id}')">
              Supprimer
            </button>

          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucun compte à rebours.</div>`;
}


/* =========================================================
   RENDER ACTIVITIES
   ========================================================= */

function renderActivityFilter() {
  const select =
    document.getElementById("activityTripFilter");

  const current =
    select.value;

  select.innerHTML =
    `<option value="">Tous les voyages</option>` +
    tripOptions().replace(
      /<option value="">.*?<\/option>/,
      ""
    );

  select.value = current;
}

function renderActivities() {
  const element =
    document.getElementById("activityList");

  const filter =
    document.getElementById("activityTripFilter").value;

  let items =
    [...db.activities]
      .filter(
        (x) =>
          !filter ||
          x.tripId === filter
      )
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );

  element.innerHTML =
    items.length
      ? items.map((item) => `
        <article class="timelineItem">

          <div class="timelineDate">
            ${formatDateTime(item.date)}
          </div>

          <h3>${escapeHTML(item.name)}</h3>

          <p>
            ✈️ ${escapeHTML(tripName(item.tripId))}
          </p>

          <p>
            📍 ${escapeHTML(item.place)}
          </p>

          <p>
            ⏱️ ${escapeHTML(item.duration)}
          </p>

          <p>
            ${escapeHTML(item.notes)}
          </p>

          <div class="actions">

            <button onclick="openActivityModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteActivity('${item.id}')">
              Supprimer
            </button>

          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucune activité.</div>`;
}


/* =========================================================
   RENDER CALENDAR
   ========================================================= */

function renderCalendar() {
  const calendar =
    document.getElementById("calendar");

  const title =
    document.getElementById("calendarTitle");

  const year =
    calendarDate.getFullYear();

  const month =
    calendarDate.getMonth();

  title.textContent =
    calendarDate.toLocaleDateString(
      "fr-FR",
      {
        month: "long",
        year: "numeric"
      }
    );

  const first =
    new Date(year, month, 1);

  const last =
    new Date(year, month + 1, 0);

  let startDay =
    first.getDay();

  startDay =
    startDay === 0 ? 6 : startDay - 1;

  const days =
    last.getDate();

  let html =
    [
      "Lun",
      "Mar",
      "Mer",
      "Jeu",
      "Ven",
      "Sam",
      "Dim"
    ]
      .map(
        (x) =>
          `<div class="calendarHeader">${x}</div>`
      )
      .join("");

  for (let i = 0; i < startDay; i++) {
    html += `<div class="calendarDay otherMonth"></div>`;
  }

  const today =
    new Date();

  for (let day = 1; day <= days; day++) {
    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;

    const dateString =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const tripEvents =
      db.trips.filter(
        (trip) =>
          trip.start?.slice(0, 10) === dateString ||
          trip.end?.slice(0, 10) === dateString
      );

    const events =
      db.events.filter(
        (event) =>
          event.date === dateString
      );

    html += `
      <div class="calendarDay ${isToday ? "today" : ""}">

        <div class="dayNumber">
          ${day}
        </div>

        ${tripEvents.map((trip) => `
          <div class="calendarEvent">
            ${escapeHTML(trip.icon)}
            ${escapeHTML(trip.name)}
          </div>
        `).join("")}

        ${events.map((event) => `
          <div class="calendarEvent">
            📌 ${escapeHTML(event.name)}
          </div>
        `).join("")}

      </div>
    `;
  }

  calendar.innerHTML = html;
}


/* =========================================================
   RENDER TRANSPORT
   ========================================================= */

function renderTransport() {
  const element =
    document.getElementById("transportList");

  element.innerHTML =
    db.transports.length
      ? db.transports.map((item) => `
        <article class="itemCard">

          <div class="badge">
            ${escapeHTML(item.type)}
          </div>

          <h3>
            ${escapeHTML(item.company)}
            ${escapeHTML(item.number)}
          </h3>

          <p>
            ${escapeHTML(item.from)}
            →
            ${escapeHTML(item.to)}
          </p>

          <p>
            🛫 ${formatDateTime(item.departure)}
          </p>

          <p>
            🛬 ${formatDateTime(item.arrival)}
          </p>

          <div class="miniGrid">

            <div class="miniStat">
              <small>Terminal</small>
              ${escapeHTML(item.terminal || "—")}
            </div>

            <div class="miniStat">
              <small>Porte / quai</small>
              ${escapeHTML(item.gate || "—")}
            </div>

            <div class="miniStat">
              <small>Siège</small>
              ${escapeHTML(item.seat || "—")}
            </div>

          </div>

          <p>
            Référence :
            ${escapeHTML(item.reference || "—")}
          </p>

          <div class="actions">

            <button onclick="openTransportModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteTransport('${item.id}')">
              Supprimer
            </button>

          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucun trajet.</div>`;
}


/* =========================================================
   RENDER BAGS
   ========================================================= */

function renderBags() {
  recalculateBags();

  const element =
    document.getElementById("bagList");

  element.innerHTML =
    db.bags.length
      ? db.bags.map((bag) => {

        const items =
          db.bagItems.filter(
            (x) => x.bagId === bag.id
          );

        const weight =
          bag.calculatedWeight > 0
            ? bag.calculatedWeight
            : Number(bag.weight || 0);

        const max =
          Number(bag.maxWeight || 0);

        const percent =
          max
            ? Math.min(100, (weight / max) * 100)
            : 0;

        const over =
          max > 0 &&
          weight > max;

        return `
          <article class="itemCard">

            <div class="badge">
              ${escapeHTML(bag.type)}
            </div>

            <h3>
              🧳 ${escapeHTML(bag.name)}
            </h3>

            <p>
              Voyage :
              ${escapeHTML(tripName(bag.tripId))}
            </p>

            <strong>
              ${weight.toFixed(2)} kg
              ${
                max
                  ? `/ ${max.toFixed(2)} kg`
                  : ""
              }
            </strong>

            ${
              max
                ? `
                  <div class="progress ${over ? "dangerProgress" : ""}">
                    <div style="width:${percent}%"></div>
                  </div>

                  <small>
                    ${
                      over
                        ? "⚠️ Poids maximal dépassé"
                        : `${Math.round(percent)} % utilisé`
                    }
                  </small>
                `
                : ""
            }

            <p>
              Dimensions :
              ${
                bag.length &&
                bag.width &&
                bag.height
                  ? `${bag.length} × ${bag.width} × ${bag.height} cm`
                  : "Non renseignées"
              }
            </p>

            <hr>

            ${
              items.length
                ? items.map((item) => `
                  <div class="packingItem">

                    <span>
                      ${escapeHTML(item.name)}
                      × ${item.quantity}
                      — ${(item.quantity * item.unitWeight).toFixed(2)} kg
                    </span>

                    <button
                      onclick="deleteBagItem('${item.id}')"
                    >
                      ×
                    </button>

                  </div>
                `).join("")
                : "<p>Aucun objet détaillé.</p>"
            }

            <div class="actions">

              <button onclick="openBagItemModal('${bag.id}')">
                ＋ Objet
              </button>

              <button onclick="openBagModal('${bag.id}')">
                Modifier
              </button>

              <button onclick="deleteBag('${bag.id}')">
                Supprimer
              </button>

            </div>

          </article>
        `;
      }).join("")
      : `<div class="empty">Aucun bagage.</div>`;
}


/* =========================================================
   RENDER PACKING
   ========================================================= */

function renderPacking() {
  const element =
    document.getElementById("packingList");

  if (!db.packing.length) {
    element.innerHTML =
      `<div class="empty">Ta liste de bagages est vide.</div>`;

    return;
  }

  const categories =
    [...new Set(
      db.packing.map(
        (x) => x.category
      )
    )];

  element.innerHTML =
    categories.map((category) => {

      const items =
        db.packing.filter(
          (x) => x.category === category
        );

      return `
        <div class="packingCategory">

          <h3>
            ${escapeHTML(category)}
          </h3>

          ${items.map((item) => `
            <div class="packingItem ${item.done ? "done" : ""}">

              <input
                type="checkbox"
                ${item.done ? "checked" : ""}
                onchange="togglePacking('${item.id}')"
              >

              <span>
                ${escapeHTML(item.name)}
                × ${item.quantity}
              </span>

              <button
                onclick="openPackingModal('${item.id}')"
              >
                ✏️
              </button>

              <button
                onclick="deletePacking('${item.id}')"
              >
                🗑️
              </button>

            </div>
          `).join("")}

        </div>
      `;
    }).join("");
}


/* =========================================================
   RENDER BUDGET
   ========================================================= */

function renderBudget() {
  const total =
    db.expenses.reduce(
      (sum, x) =>
        sum + Number(x.amount || 0),
      0
    );

  const categoryTotal =
    (category) =>
      db.expenses
        .filter(
          (x) =>
            x.category === category
        )
        .reduce(
          (sum, x) =>
            sum + Number(x.amount || 0),
          0
        );

  document.getElementById("budgetTotal")
    .textContent = money(total);

  document.getElementById("budgetTransport")
    .textContent =
    money(categoryTotal("Transport"));

  document.getElementById("budgetHotel")
    .textContent =
    money(categoryTotal("Hébergement"));

  document.getElementById("budgetFood")
    .textContent =
    money(categoryTotal("Alimentation"));

  const element =
    document.getElementById("expenseList");

  element.innerHTML =
    db.expenses.length
      ? db.expenses.map((item) => `
        <div class="itemCard" style="margin-bottom:10px">

          <div class="badge">
            ${escapeHTML(item.category)}
          </div>

          <h3>
            ${escapeHTML(item.name)}
          </h3>

          <p>
            ${formatDate(item.date)}
          </p>

          <strong>
            ${money(item.amount)}
          </strong>

          ${
            item.person
              ? `<p>Payé par : ${escapeHTML(item.person)}</p>`
              : ""
          }

          <div class="actions">
            <button onclick="openExpenseModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteExpense('${item.id}')">
              Supprimer
            </button>
          </div>

        </div>
      `).join("")
      : `<div class="empty">Aucune dépense.</div>`;
}


/* =========================================================
   RENDER BOOKINGS
   ========================================================= */

function renderBookings() {
  const element =
    document.getElementById("bookingList");

  element.innerHTML =
    db.bookings.length
      ? db.bookings.map((item) => `
        <article class="itemCard">

          <div class="badge">
            ${escapeHTML(item.type)}
          </div>

          <h3>
            ${escapeHTML(item.name)}
          </h3>

          <p>
            Voyage :
            ${escapeHTML(tripName(item.tripId))}
          </p>

          <p>
            📅 ${formatDateTime(item.date)}
          </p>

          <p>
            Référence :
            <strong>
              ${escapeHTML(item.reference || "—")}
            </strong>
          </p>

          ${
            item.price
              ? `<p>💶 ${money(item.price)}</p>`
              : ""
          }

          ${
            item.url
              ? `
                <a
                  href="${escapeHTML(item.url)}"
                  target="_blank"
                  rel="noopener"
                >
                  🔗 Ouvrir le lien
                </a>
              `
              : ""
          }

          <div class="actions">
            <button onclick="openBookingModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteBooking('${item.id}')">
              Supprimer
            </button>
          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucune réservation.</div>`;
}


/* =========================================================
   RENDER DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const element =
    document.getElementById("documentList");

  element.innerHTML =
    db.documents.length
      ? db.documents.map((item) => `
        <article class="itemCard">

          <div class="badge">
            ${escapeHTML(item.type)}
          </div>

          <h3>
            📄 ${escapeHTML(item.name)}
          </h3>

          <p>
            ${escapeHTML(item.reference || "")}
          </p>

          ${
            item.expiry
              ? `<p>Expiration : ${formatDate(item.expiry)}</p>`
              : ""
          }

          ${
            item.url
              ? `
                <a
                  href="${escapeHTML(item.url)}"
                  target="_blank"
                  rel="noopener"
                >
                  🔗 Ouvrir
                </a>
              `
              : ""
          }

          <div class="actions">
            <button onclick="openDocumentModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteDocument('${item.id}')">
              Supprimer
            </button>
          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucun document.</div>`;
}


/* =========================================================
   RENDER NOTES
   ========================================================= */

function renderNotes() {
  const element =
    document.getElementById("noteList");

  element.innerHTML =
    db.notes.length
      ? db.notes.map((item) => `
        <article class="itemCard">

          <h3>
            📝 ${escapeHTML(item.title)}
          </h3>

          <p>
            ${escapeHTML(item.content)}
          </p>

          <small>
            ${formatDateTime(item.updatedAt)}
          </small>

          <div class="actions">

            <button onclick="openNoteModal('${item.id}')">
              Modifier
            </button>

            <button onclick="deleteNote('${item.id}')">
              Supprimer
            </button>

          </div>

        </article>
      `).join("")
      : `<div class="empty">Aucune note.</div>`;
}


/* =========================================================
   RENDER CHECKLISTS
   ========================================================= */

function renderChecklists() {
  const element =
    document.getElementById("checklistList");

  element.innerHTML =
    db.checklists.length
      ? db.checklists.map((list) => {

        const done =
          list.items.filter(
            (x) => x.done
          ).length;

        const total =
          list.items.length;

        return `
          <article class="card" style="margin-bottom:15px">

            <div class="cardHeader">

              <div>
                <span class="badge">
                  ${escapeHTML(list.type)}
                </span>

                <h3>
                  ${escapeHTML(list.name)}
                </h3>
              </div>

              <strong>
                ${done}/${total}
              </strong>

            </div>

            ${
              list.items.map((item) => `
                <div class="packingItem ${item.done ? "done" : ""}">

                  <input
                    type="checkbox"
                    ${item.done ? "checked" : ""}
                    onchange="
                      toggleChecklistItem(
                        '${list.id}',
                        '${item.id}'
                      )
                    "
                  >

                  <span>
                    ${escapeHTML(item.name)}
                  </span>

                </div>
              `).join("")
            }

            <div class="actions">

              <button onclick="addChecklistItem('${list.id}')">
                ＋ Élément
              </button>

              <button onclick="deleteChecklist('${list.id}')">
                Supprimer
              </button>

            </div>

          </article>
        `;
      }).join("")
      : `<div class="empty">Aucune checklist.</div>`;
}


/* =========================================================
   MAIN RENDER
   ========================================================= */

function renderAll() {
  applyTheme();

  renderDashboard();
  renderTrips();
  renderCountdowns();

  renderActivityFilter();
  renderActivities();

  renderCalendar();

  renderTransport();
  renderBags();
  renderPacking();
  renderBudget();
  renderBookings();
  renderDocuments();
  renderNotes();
  renderChecklists();

  if (db.internet) {
    renderInternet(db.internet);
  }
}


/* =========================================================
   CLOCK
   ========================================================= */

setInterval(() => {
  renderDashboard();
  renderCountdowns();
}, 1000);


/* =========================================================
   STARTUP
   ========================================================= */

applyTheme();

renderAll();

loadServerStatus();