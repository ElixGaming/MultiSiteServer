const STORAGE_KEY = "MiniDatacenterConfiguration";

let state = {
    racks: []
};

let selectedEquipment = null;

let zoom = 1;

let modalMode = null;
let modalData = null;

let toastTimer = null;


/* =========================================================
   ÉQUIPEMENTS
========================================================= */

const equipmentTypes = [

    {
        id: "pdu",
        name: "Alimentation / PDU",
        type: "PDU",
        height: 1,
        icon: "⚡",
        color: "#e0b52f"
    },

    {
        id: "router",
        name: "Routeur",
        type: "Routeur",
        height: 1,
        icon: "◈",
        color: "#4da3ff"
    },

    {
        id: "switch",
        name: "Switch",
        type: "Switch",
        height: 1,
        icon: "⇄",
        color: "#48d17b"
    },

    {
        id: "patch",
        name: "Patch panel",
        type: "Patch panel",
        height: 1,
        icon: "▤",
        color: "#b58cff"
    },

    {
        id: "server",
        name: "Serveur",
        type: "Serveur",
        height: 2,
        icon: "▥",
        color: "#ff6969"
    },

    {
        id: "nas",
        name: "NAS",
        type: "NAS",
        height: 2,
        icon: "▦",
        color: "#43c8d9"
    },

    {
        id: "ups",
        name: "Onduleur",
        type: "Onduleur",
        height: 2,
        icon: "◉",
        color: "#ef8d5b"
    }

];


/* =========================================================
   UTILITAIRES
========================================================= */

function generateId(prefix = "id") {

    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


function saveState() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );

    const status =
        document.getElementById("saveStatus");

    status.textContent = "Sauvegardé";

}


function loadState() {

    try {

        const saved =
            localStorage.getItem(STORAGE_KEY);

        if (saved) {

            state = JSON.parse(saved);

        }

    } catch (error) {

        console.error(error);

        state = {
            racks: []
        };

    }


    if (!state.racks) {

        state.racks = [];

    }


    state.racks.forEach(rack => {

        if (!Array.isArray(rack.objects)) {

            rack.objects = [];

        }

        if (!Array.isArray(rack.floors)) {

            rack.floors = [];

        }

    });

}


function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 2200);

}


/* =========================================================
   MODALE
========================================================= */

function openModal(type, title, html, data = null) {

    modalMode = type;

    modalData = data;

    document.getElementById("modalType")
        .textContent = type.toUpperCase();

    document.getElementById("modalTitle")
        .textContent = title;

    document.getElementById("modalForm")
        .innerHTML = html;

    document.getElementById("modal")
        .classList.remove("hidden");

}


function closeModal() {

    document.getElementById("modal")
        .classList.add("hidden");

    modalMode = null;

    modalData = null;

}


document
    .getElementById("closeModal")
    .addEventListener("click", closeModal);


document
    .getElementById("modal")
    .addEventListener("click", event => {

        if (
            event.target ===
            document.getElementById("modal")
        ) {

            closeModal();

        }

    });


/* =========================================================
   RACKS
========================================================= */

function createRack() {

    openModal(
        "rack",
        "Nouveau rack",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Nom du rack</label>

                <input
                    id="rackName"
                    type="text"
                    value="Rack ${state.racks.length + 1}"
                    required
                >
            </div>


            <div class="form-group full">
                <label>Nombre de U</label>

                <input
                    id="rackUnits"
                    type="number"
                    min="1"
                    max="60"
                    value="12"
                    required
                >
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>

            <button
                type="submit"
                class="btn primary"
            >
                Créer le rack
            </button>

        </div>
        `
    );

}


function editRack(rackId) {

    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    openModal(
        "rack-edit",
        "Modifier le rack",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Nom du rack</label>

                <input
                    id="rackName"
                    type="text"
                    value="${escapeHtml(rack.name)}"
                    required
                >
            </div>


            <div class="form-group full">
                <label>Nombre de U</label>

                <input
                    id="rackUnits"
                    type="number"
                    min="1"
                    max="60"
                    value="${rack.units}"
                    required
                >
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn danger"
                id="deleteRackBtn"
            >
                Supprimer
            </button>


            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>


            <button
                type="submit"
                class="btn primary"
            >
                Enregistrer
            </button>

        </div>
        `,

        rack
    );


    document
        .getElementById("deleteRackBtn")
        .addEventListener("click", () => {

            if (
                confirm(
                    `Supprimer "${rack.name}" ?`
                )
            ) {

                state.racks =
                    state.racks.filter(
                        r => r.id !== rack.id
                    );

                saveState();

                closeModal();

                render();

                showToast("Rack supprimé");

            }

        });

}


function addUnit(rackId) {

    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    if (rack.units >= 60) {

        showToast("Maximum : 60 U");

        return;

    }


    rack.units++;

    saveState();

    render();

    showToast("U ajoutée");

}


function removeUnit(rackId) {

    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    if (rack.units <= 1) {

        showToast("Le rack doit garder au moins 1 U");

        return;

    }


    /*
        On empêche la suppression si un équipement
        occupe l'U supprimée.
    */

    const occupied =
        rack.objects.some(object => {

            const end =
                object.startU +
                object.height -
                1;

            return (
                rack.units >= object.startU &&
                rack.units <= end
            );

        });


    if (occupied) {

        showToast(
            "Impossible : l'U contient un équipement"
        );

        return;

    }


    rack.units--;

    /*
        Les étages ne consomment aucune U.
        Si un étage était positionné au-dessus
        de la dernière U, on le déplace automatiquement
        sur la nouvelle limite.
    */

    rack.floors.forEach(floor => {

        if (floor.afterU > rack.units) {

            floor.afterU = rack.units;

        }

    });


    saveState();

    render();

    showToast("U supprimée");

}


/* =========================================================
   ÉQUIPEMENTS
========================================================= */

function renderEquipmentPalette() {

    const list =
        document.getElementById(
            "equipmentList"
        );

    list.innerHTML = "";


    equipmentTypes.forEach(equipment => {

        const button =
            document.createElement("button");

        button.className =
            "equipment-item";


        if (
            selectedEquipment &&
            selectedEquipment.id === equipment.id
        ) {

            button.classList.add("selected");

        }


        button.innerHTML = `

            <div
                class="equipment-icon"
                style="color:${equipment.color}"
            >
                ${equipment.icon}
            </div>

            <div class="equipment-info">

                <div class="equipment-name">
                    ${equipment.name}
                </div>

                <div class="equipment-meta">
                    ${equipment.height} U
                </div>

            </div>
        `;


        button.addEventListener(
            "click",
            () => selectEquipment(equipment)
        );


        list.appendChild(button);

    });

}


function selectEquipment(equipment) {

    selectedEquipment = {
        ...equipment
    };


    renderEquipmentPalette();


    showToast(
        `${equipment.name} sélectionné`
    );

}


function customObject() {

    openModal(
        "custom",
        "Objet personnalisé",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Nom</label>

                <input
                    id="objectName"
                    type="text"
                    placeholder="Ex : Firewall"
                    required
                >
            </div>


            <div class="form-group">
                <label>Type</label>

                <input
                    id="objectType"
                    type="text"
                    placeholder="Ex : Firewall"
                    required
                >
            </div>


            <div class="form-group">
                <label>Hauteur</label>

                <input
                    id="objectHeight"
                    type="number"
                    min="1"
                    max="20"
                    value="1"
                    required
                >
            </div>


            <div class="form-group full">
                <label>Modèle</label>

                <input
                    id="objectModel"
                    type="text"
                    placeholder="Optionnel"
                >
            </div>


            <div class="form-group">
                <label>Couleur</label>

                <input
                    id="objectColor"
                    type="color"
                    value="#4da3ff"
                >
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>

            <button
                type="submit"
                class="btn primary"
            >
                Créer
            </button>

        </div>
        `
    );

}


/* =========================================================
   PLACEMENT ÉQUIPEMENT
========================================================= */

function canPlaceObject(
    rack,
    startU,
    height,
    ignoredObjectId = null
) {

    const endU =
        startU + height - 1;


    if (
        startU < 1 ||
        endU > rack.units
    ) {

        return false;

    }


    return !rack.objects.some(object => {

        if (
            ignoredObjectId &&
            object.id === ignoredObjectId
        ) {

            return false;

        }


        const objectStart =
            object.startU;

        const objectEnd =
            object.startU +
            object.height -
            1;


        return (
            startU <= objectEnd &&
            endU >= objectStart
        );

    });

}


function placeObject(
    rackId,
    startU
) {

    if (!selectedEquipment) {

        showToast(
            "Sélectionne d'abord un équipement"
        );

        return;

    }


    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    if (
        !canPlaceObject(
            rack,
            startU,
            selectedEquipment.height
        )
    ) {

        showToast(
            "Pas assez de place ici"
        );

        return;

    }


    rack.objects.push({

        id: generateId("object"),

        name:
            selectedEquipment.name,

        type:
            selectedEquipment.type,

        model: "",

        height:
            selectedEquipment.height,

        startU,

        icon:
            selectedEquipment.icon,

        color:
            selectedEquipment.color

    });


    saveState();

    render();

    showToast(
        `${selectedEquipment.name} placé`
    );

}


/* =========================================================
   MODIFICATION ÉQUIPEMENT
========================================================= */

function editObject(
    rackId,
    objectId
) {

    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    const object =
        rack.objects.find(
            o => o.id === objectId
        );

    if (!object) return;


    openModal(
        "équipement",
        "Modifier l'équipement",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Nom</label>

                <input
                    id="objectName"
                    type="text"
                    value="${escapeHtml(object.name)}"
                    required
                >
            </div>


            <div class="form-group">
                <label>Type</label>

                <input
                    id="objectType"
                    type="text"
                    value="${escapeHtml(object.type)}"
                    required
                >
            </div>


            <div class="form-group">
                <label>Hauteur</label>

                <input
                    id="objectHeight"
                    type="number"
                    min="1"
                    max="20"
                    value="${object.height}"
                    required
                >
            </div>


            <div class="form-group">
                <label>U de départ</label>

                <input
                    id="objectStartU"
                    type="number"
                    min="1"
                    max="${rack.units}"
                    value="${object.startU}"
                    required
                >
            </div>


            <div class="form-group">
                <label>Couleur</label>

                <input
                    id="objectColor"
                    type="color"
                    value="${object.color}"
                >
            </div>


            <div class="form-group full">
                <label>Modèle</label>

                <input
                    id="objectModel"
                    type="text"
                    value="${escapeHtml(object.model || "")}"
                >
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn danger"
                id="deleteObjectBtn"
            >
                Supprimer
            </button>


            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>


            <button
                type="submit"
                class="btn primary"
            >
                Enregistrer
            </button>

        </div>
        `,

        {
            rack,
            object
        }
    );


    document
        .getElementById("deleteObjectBtn")
        .addEventListener("click", () => {

            if (
                confirm(
                    `Supprimer "${object.name}" ?`
                )
            ) {

                rack.objects =
                    rack.objects.filter(
                        o => o.id !== object.id
                    );

                saveState();

                closeModal();

                render();

                showToast(
                    "Équipement supprimé"
                );

            }

        });

}


/* =========================================================
   ÉTAGES
========================================================= */

/*
    Un étage est défini par :

        afterU: 11

    ce qui signifie :

        U12
        U11
        ========= ÉTAGE =========
        U10
        U9

    L'étage ne consomme donc aucune U.
*/


function addFloor() {

    if (state.racks.length === 0) {

        showToast(
            "Crée d'abord un rack"
        );

        return;

    }


    /*
        S'il n'y a qu'un rack,
        on l'utilise directement.

        S'il y en a plusieurs,
        on demande dans quel rack
        placer l'étage.
    */

    const rackOptions =
        state.racks
            .map(
                rack =>
                    `<option value="${rack.id}">
                        ${escapeHtml(rack.name)}
                    </option>`
            )
            .join("");


    const firstRack =
        state.racks[0];


    openModal(
        "étage",
        "Ajouter un étage",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Rack</label>

                <select id="floorRack">
                    ${rackOptions}
                </select>
            </div>


            <div class="form-group full">
                <label>Nom de l'étage</label>

                <input
                    id="floorName"
                    type="text"
                    value="Étage"
                    required
                >
            </div>


            <div class="form-group full">
                <label>Position</label>

                <select id="floorPosition">
                </select>
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>

            <button
                type="submit"
                class="btn primary"
            >
                Ajouter
            </button>

        </div>
        `
    );


    const rackSelect =
        document.getElementById(
            "floorRack"
        );

    const positionSelect =
        document.getElementById(
            "floorPosition"
        );


    function updatePositions() {

        const rack =
            state.racks.find(
                r => r.id === rackSelect.value
            );

        if (!rack) return;


        positionSelect.innerHTML = "";


        /*
            afterU = 1 signifie :
            séparation entre U1 et le bas du rack.

            afterU = 11 signifie :
            séparation entre U11 et U10.
        */

        for (
            let u = rack.units;
            u >= 1;
            u--
        ) {

            const option =
                document.createElement("option");

            option.value = u;

            option.textContent =
                `Entre U${u} et U${Math.max(u - 1, 0)}`;

            if (u === Math.floor(rack.units / 2)) {

                option.selected = true;

            }

            positionSelect.appendChild(option);

        }

    }


    rackSelect.addEventListener(
        "change",
        updatePositions
    );


    updatePositions();

}


function editFloor(
    rackId,
    floorId
) {

    const rack =
        state.racks.find(
            r => r.id === rackId
        );

    if (!rack) return;


    const floor =
        rack.floors.find(
            f => f.id === floorId
        );

    if (!floor) return;


    let options = "";


    for (
        let u = rack.units;
        u >= 1;
        u--
    ) {

        options += `

            <option
                value="${u}"
                ${u === floor.afterU ? "selected" : ""}
            >
                Entre U${u} et U${Math.max(u - 1, 0)}
            </option>

        `;

    }


    openModal(
        "étage",
        "Modifier l'étage",

        `
        <div class="form-grid">

            <div class="form-group full">
                <label>Nom de l'étage</label>

                <input
                    id="floorName"
                    type="text"
                    value="${escapeHtml(floor.name)}"
                    required
                >
            </div>


            <div class="form-group full">
                <label>Position</label>

                <select id="floorPosition">
                    ${options}
                </select>
            </div>

        </div>


        <div class="form-actions">

            <button
                type="button"
                class="btn danger"
                id="deleteFloorBtn"
            >
                Supprimer
            </button>


            <button
                type="button"
                class="btn secondary"
                onclick="closeModal()"
            >
                Annuler
            </button>


            <button
                type="submit"
                class="btn primary"
            >
                Enregistrer
            </button>

        </div>
        `,

        {
            rack,
            floor
        }
    );


    document
        .getElementById("deleteFloorBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    confirm(
                        `Supprimer "${floor.name}" ?`
                    )
                ) {

                    rack.floors =
                        rack.floors.filter(
                            f => f.id !== floor.id
                        );

                    saveState();

                    closeModal();

                    render();

                    showToast(
                        "Étage supprimé"
                    );

                }

            }
        );

}


/* =========================================================
   RENDU
========================================================= */

function render() {

    renderEquipmentPalette();


    const racksContainer =
        document.getElementById("racks");


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    racksContainer.innerHTML = "";


    let objectCount = 0;

    let floorCount = 0;


    state.racks.forEach(rack => {

        objectCount +=
            rack.objects.length;

        floorCount +=
            rack.floors.length;


        racksContainer.appendChild(
            renderRack(rack)
        );

    });


    document.getElementById(
        "rackCount"
    ).textContent =
        `${state.racks.length} rack${
            state.racks.length > 1 ? "s" : ""
        }`;


    document.getElementById(
        "objectCount"
    ).textContent =
        `${objectCount} équipement${
            objectCount > 1 ? "s" : ""
        }`;


    document.getElementById(
        "floorCount"
    ).textContent =
        `${floorCount} étage${
            floorCount > 1 ? "s" : ""
        }`;


    emptyState.style.display =
        state.racks.length === 0
            ? "block"
            : "none";

}


/* =========================================================
   RENDU D'UN RACK
========================================================= */

function renderRack(rack) {

    const card =
        document.createElement("div");

    card.className =
        "rack-card";


    const header =
        document.createElement("div");

    header.className =
        "rack-header";


    header.innerHTML = `

        <div>

            <div class="rack-name">
                ${escapeHtml(rack.name)}
            </div>

            <div class="rack-subtitle">
                ${rack.units} U ·
                ${rack.objects.length} équipement(s) ·
                ${rack.floors.length} étage(s)
            </div>

        </div>


        <div class="rack-actions">

            <button
                class="rack-action editRack"
                title="Modifier"
            >
                ⚙
            </button>

            <button
                class="rack-action addUnit"
                title="Ajouter une U"
            >
                ＋
            </button>

            <button
                class="rack-action removeUnit"
                title="Supprimer une U"
            >
                −
            </button>

        </div>

    `;


    card.appendChild(header);


    const frame =
        document.createElement("div");

    frame.className =
        "rack-frame";


    const inner =
        document.createElement("div");

    inner.className =
        "rack-inner";


    /*
        On parcourt les U du haut vers le bas.

        Pour chaque U :
        1. On affiche l'équipement s'il commence ici.
        2. On affiche une séparation d'étage
           après cette U si nécessaire.
    */


    const occupied =
        new Map();


    rack.objects.forEach(object => {

        for (
            let u = object.startU;
            u <
            object.startU + object.height;
            u++
        ) {

            occupied.set(
                u,
                object
            );

        }

    });


    for (
        let u = rack.units;
        u >= 1;
        u--
    ) {

        const object =
            rack.objects.find(
                o => o.startU === u
            );


        /*
            Si un équipement commence sur cette U,
            on affiche son bloc.
        */

        if (object) {

            const row =
                document.createElement("div");

            row.className =
                "rack-u";


            const label =
                document.createElement("div");

            label.className =
                "u-label";

            label.textContent =
                `U${u}`;


            const slot =
                document.createElement("div");

            slot.className =
                "u-slot";


            const placed =
                document.createElement("div");

            placed.className =
                "placed-object";


            placed.style.setProperty(
                "--object-color",
                object.color
            );


            placed.style.minHeight =
                `${Math.max(
                    28,
                    object.height * 31
                )}px`;


            placed.innerHTML = `

                <div
                    class="object-icon"
                    style="color:${object.color}"
                >
                    ${object.icon || "▣"}
                </div>


                <div class="object-main">

                    <div class="object-name">
                        ${escapeHtml(object.name)}
                    </div>

                    <div class="object-details">
                        ${escapeHtml(object.type)}
                        ${
                            object.model
                                ? " · " +
                                  escapeHtml(object.model)
                                : ""
                        }
                    </div>

                </div>


                <div class="object-u">
                    ${object.height} U
                </div>

            `;


            placed.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    editObject(
                        rack.id,
                        object.id
                    );

                }
            );


            slot.appendChild(placed);

            row.appendChild(label);

            row.appendChild(slot);

            inner.appendChild(row);


            /*
                On saute les U occupées par
                le même équipement.
            */

            u -= object.height - 1;

        } else if (!occupied.has(u)) {

            /*
                U libre.
            */

            const row =
                document.createElement("div");

            row.className =
                "rack-u";


            const label =
                document.createElement("div");

            label.className =
                "u-label";

            label.textContent =
                `U${u}`;


            const slot =
                document.createElement("div");

            slot.className =
                "u-slot free";


            slot.addEventListener(
                "click",
                () => {

                    placeObject(
                        rack.id,
                        u
                    );

                }
            );


            row.appendChild(label);

            row.appendChild(slot);

            inner.appendChild(row);

        }


        /*
            ÉTAGE

            afterU === u

            signifie que la séparation est
            juste sous cette U.
        */

        const floors =
            rack.floors.filter(
                floor =>
                    floor.afterU === u
            );


        floors.forEach(floor => {

            inner.appendChild(
                renderFloor(
                    rack,
                    floor
                )
            );

        });

    }


    frame.appendChild(inner);

    card.appendChild(frame);


    /*
        Boutons du rack
    */

    header
        .querySelector(".editRack")
        .addEventListener(
            "click",
            () => editRack(rack.id)
        );


    header
        .querySelector(".addUnit")
        .addEventListener(
            "click",
            () => addUnit(rack.id)
        );


    header
        .querySelector(".removeUnit")
        .addEventListener(
            "click",
            () => removeUnit(rack.id)
        );


    return card;

}


/* =========================================================
   RENDU ÉTAGE
========================================================= */

function renderFloor(
    rack,
    floor
) {

    const separator =
        document.createElement("div");

    separator.className =
        "floor-separator";


    separator.title =
        "Cliquer pour modifier cet étage";


    separator.innerHTML = `

        <div class="floor-line"></div>

        <div class="floor-label">
            ${escapeHtml(floor.name)}
        </div>

    `;


    separator.addEventListener(
        "click",
        () => {

            editFloor(
                rack.id,
                floor.id
            );

        }
    );


    return separator;

}


/* =========================================================
   FORMULAIRE MODALE
========================================================= */

document
    .getElementById("modalForm")
    .addEventListener(
        "submit",
        event => {

            event.preventDefault();


            /* =====================
               NOUVEAU RACK
            ===================== */

            if (modalMode === "rack") {

                const name =
                    document.getElementById(
                        "rackName"
                    ).value.trim();


                const units =
                    Number(
                        document.getElementById(
                            "rackUnits"
                        ).value
                    );


                if (
                    !name ||
                    units < 1 ||
                    units > 60
                ) {

                    return;

                }


                state.racks.push({

                    id: generateId("rack"),

                    name,

                    units,

                    objects: [],

                    floors: []

                });


                saveState();

                closeModal();

                render();

                showToast(
                    "Rack créé"
                );

            }


            /* =====================
               MODIFICATION RACK
            ===================== */

            else if (
                modalMode === "rack-edit"
            ) {

                const rack =
                    modalData;


                const name =
                    document.getElementById(
                        "rackName"
                    ).value.trim();


                const units =
                    Number(
                        document.getElementById(
                            "rackUnits"
                        ).value
                    );


                if (
                    !name ||
                    units < 1 ||
                    units > 60
                ) {

                    return;

                }


                /*
                    Vérifie qu'aucun équipement
                    ne dépasse la nouvelle hauteur.
                */

                const invalidObject =
                    rack.objects.some(
                        object =>
                            object.startU +
                            object.height -
                            1 >
                            units
                    );


                if (invalidObject) {

                    showToast(
                        "Impossible : un équipement dépasserait le rack"
                    );

                    return;

                }


                rack.name = name;

                rack.units = units;


                rack.floors.forEach(
                    floor => {

                        if (
                            floor.afterU >
                            units
                        ) {

                            floor.afterU =
                                units;

                        }

                    }
                );


                saveState();

                closeModal();

                render();

                showToast(
                    "Rack modifié"
                );

            }


            /* =====================
               OBJET PERSONNALISÉ
            ===================== */

            else if (
                modalMode === "custom"
            ) {

                const name =
                    document.getElementById(
                        "objectName"
                    ).value.trim();


                const type =
                    document.getElementById(
                        "objectType"
                    ).value.trim();


                const height =
                    Number(
                        document.getElementById(
                            "objectHeight"
                        ).value
                    );


                const model =
                    document.getElementById(
                        "objectModel"
                    ).value.trim();


                const color =
                    document.getElementById(
                        "objectColor"
                    ).value;


                if (
                    !name ||
                    !type ||
                    height < 1
                ) {

                    return;

                }


                selectedEquipment = {

                    id: generateId("custom"),

                    name,

                    type,

                    height,

                    icon: "▣",

                    color,

                    model

                };


                closeModal();

                renderEquipmentPalette();

                showToast(
                    `${name} sélectionné`
                );

            }


            /* =====================
               MODIFICATION OBJET
            ===================== */

            else if (
                modalMode === "équipement"
            ) {

                const rack =
                    modalData.rack;

                const object =
                    modalData.object;


                const name =
                    document.getElementById(
                        "objectName"
                    ).value.trim();


                const type =
                    document.getElementById(
                        "objectType"
                    ).value.trim();


                const height =
                    Number(
                        document.getElementById(
                            "objectHeight"
                        ).value
                    );


                const startU =
                    Number(
                        document.getElementById(
                            "objectStartU"
                        ).value
                    );


                const color =
                    document.getElementById(
                        "objectColor"
                    ).value;


                const model =
                    document.getElementById(
                        "objectModel"
                    ).value.trim();


                if (
                    !name ||
                    !type ||
                    height < 1
                ) {

                    return;

                }


                if (
                    !canPlaceObject(
                        rack,
                        startU,
                        height,
                        object.id
                    )
                ) {

                    showToast(
                        "Cette position est occupée ou dépasse le rack"
                    );

                    return;

                }


                object.name = name;

                object.type = type;

                object.height = height;

                object.startU = startU;

                object.color = color;

                object.model = model;


                saveState();

                closeModal();

                render();

                showToast(
                    "Équipement modifié"
                );

            }


            /* =====================
               NOUVEL ÉTAGE
            ===================== */

            else if (
                modalMode === "étage"
            ) {

                const rackId =
                    document.getElementById(
                        "floorRack"
                    ).value;


                const rack =
                    state.racks.find(
                        r => r.id === rackId
                    );


                if (!rack) {

                    return;

                }


                const name =
                    document.getElementById(
                        "floorName"
                    ).value.trim();


                const afterU =
                    Number(
                        document.getElementById(
                            "floorPosition"
                        ).value
                    );


                if (
                    !name ||
                    afterU < 1 ||
                    afterU > rack.units
                ) {

                    return;

                }


                rack.floors.push({

                    id: generateId("floor"),

                    name,

                    afterU

                });


                saveState();

                closeModal();

                render();

                showToast(
                    "Étage ajouté"
                );

            }


            /* =====================
               MODIFICATION ÉTAGE
            ===================== */

            else if (
                modalMode === "étage"
                && modalData
            ) {

                /*
                    Ce cas est volontairement
                    géré ci-dessous dans la
                    version modification.
                */

            }

        }
    );


/*
    Le mode "étage" sert aussi à modifier
    un étage existant. On intercepte donc
    séparément le formulaire avec le contexte.
*/

const originalSubmit =
    document.getElementById(
        "modalForm"
    );


/*
    Pour distinguer ajout et modification
    d'un étage, on utilise modalData.
*/


document
    .getElementById("modalForm")
    .addEventListener(
        "submit",
        () => {},
        true
    );


/* =========================================================
   CORRECTION FORMULAIRE ÉTAGE MODIFICATION
========================================================= */

/*
    On remplace le handler précédent par une logique
    centralisée au niveau du formulaire.
*/

document
    .getElementById("modalForm")
    .onsubmit = function(event) {

        event.preventDefault();


        if (modalMode !== "étage") {

            return;

        }


        /* Modification d'un étage */

        if (
            modalData &&
            modalData.rack &&
            modalData.floor
        ) {

            const rack =
                modalData.rack;

            const floor =
                modalData.floor;


            const name =
                document.getElementById(
                    "floorName"
                ).value.trim();


            const afterU =
                Number(
                    document.getElementById(
                        "floorPosition"
                    ).value
                );


            if (
                !name ||
                afterU < 1 ||
                afterU > rack.units
            ) {

                return;

            }


            floor.name = name;

            floor.afterU = afterU;


            saveState();

            closeModal();

            render();

            showToast(
                "Étage modifié"
            );

            return;

        }


        /* Ajout d'un étage */

        const rackId =
            document.getElementById(
                "floorRack"
            ).value;


        const rack =
            state.racks.find(
                r => r.id === rackId
            );


        if (!rack) return;


        const name =
            document.getElementById(
                "floorName"
            ).value.trim();


        const afterU =
            Number(
                document.getElementById(
                    "floorPosition"
                ).value
            );


        if (
            !name ||
            afterU < 1 ||
            afterU > rack.units
        ) {

            return;

        }


        rack.floors.push({

            id: generateId("floor"),

            name,

            afterU

        });


        saveState();

        closeModal();

        render();

        showToast(
            "Étage ajouté"
        );

    };


/* =========================================================
   ZOOM
========================================================= */

document
    .getElementById("zoomIn")
    .addEventListener(
        "click",
        () => {

            zoom =
                Math.min(
                    1.5,
                    zoom + 0.1
                );

            applyZoom();

        }
    );


document
    .getElementById("zoomOut")
    .addEventListener(
        "click",
        () => {

            zoom =
                Math.max(
                    0.7,
                    zoom - 0.1
                );

            applyZoom();

        }
    );


function applyZoom() {

    document
        .getElementById("zoomLabel")
        .textContent =
        `${Math.round(zoom * 100)}%`;


    document
        .querySelectorAll(".rack-frame")
        .forEach(frame => {

            frame.style.transformOrigin =
                "top left";

            frame.style.transform =
                `scale(${zoom})`;

        });

}


/* =========================================================
   BOUTONS
========================================================= */

document
    .getElementById("newRackBtn")
    .addEventListener(
        "click",
        createRack
    );


document
    .getElementById("emptyNewRack")
    .addEventListener(
        "click",
        createRack
    );


document
    .getElementById("customObjectBtn")
    .addEventListener(
        "click",
        customObject
    );


document
    .getElementById("addFloorBtn")
    .addEventListener(
        "click",
        addFloor
    );


document
    .getElementById("resetBtn")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Réinitialiser tous les racks, équipements et étages ?"
                )
            ) {

                return;

            }


            state = {
                racks: []
            };


            selectedEquipment = null;

            saveState();

            render();

            showToast(
                "Configuration réinitialisée"
            );

        }
    );


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   INITIALISATION
========================================================= */

loadState();

render();