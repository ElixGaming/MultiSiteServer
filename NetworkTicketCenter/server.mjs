import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "network-data.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
    devices: [],
    tickets: []
};

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(
                DATA_FILE,
                JSON.stringify(defaultData, null, 2),
                "utf8"
            );
            return structuredClone(defaultData);
        }

        return JSON.parse(
            fs.readFileSync(DATA_FILE, "utf8")
        );
    } catch (error) {
        console.error("Erreur lecture données :", error);
        return structuredClone(defaultData);
    }
}

let data = loadData();

function saveData() {
    const tempFile = DATA_FILE + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(data, null, 2),
        "utf8"
    );

    fs.renameSync(tempFile, DATA_FILE);
}


/* --------------------------------------------------
   SSE CLIENTS
-------------------------------------------------- */

const clients = new Set();

function broadcast() {

    const message = JSON.stringify({
        type: "state",
        data
    });

    for (const response of clients) {

        try {
            response.write(
                `event: state\n` +
                `data: ${message}\n\n`
            );
        } catch {
            clients.delete(response);
        }
    }
}


/* --------------------------------------------------
   UTILITAIRES
-------------------------------------------------- */

function jsonResponse(res, status, object) {

    const body = JSON.stringify(object);

    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
    });

    res.end(body);
}


function readBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";

        req.on("data", chunk => {

            body += chunk;

            if (body.length > 1_000_000) {
                req.destroy();
                reject(
                    new Error("Requête trop volumineuse")
                );
            }

        });

        req.on("end", () => {

            try {
                resolve(
                    body ? JSON.parse(body) : {}
                );
            } catch {
                reject(
                    new Error("JSON invalide")
                );
            }

        });

        req.on("error", reject);
    });
}


function clean(value, max = 300) {

    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .slice(0, max);
}


function generateId() {

    return crypto.randomUUID();
}


function generateTicketNumber() {

    let number;

    do {

        number =
            crypto.randomInt(
                1_000_000_000,
                10_000_000_000
            ).toString();

    } while (
        data.tickets.some(
            ticket => ticket.number === number
        )
    );

    return number;
}


function getDevice(deviceId) {

    return data.devices.find(
        device => device.id === deviceId
    );
}


function activeTicketForDevice(deviceId) {

    return data.tickets.find(
        ticket =>
            ticket.deviceId === deviceId &&
            ticket.status !== "CLOSED"
    );
}


/* --------------------------------------------------
   API
-------------------------------------------------- */

async function api(req, res) {

    const url = new URL(
        req.url,
        `http://${req.headers.host}`
    );

    const pathname = url.pathname;
    const method = req.method;


    /* GET STATE */

    if (
        method === "GET" &&
        pathname === "/api/state"
    ) {

        return jsonResponse(
            res,
            200,
            data
        );
    }


    /* SSE */

    if (
        method === "GET" &&
        pathname === "/api/events"
    ) {

        res.writeHead(200, {

            "Content-Type":
                "text/event-stream; charset=utf-8",

            "Cache-Control": "no-cache",

            "Connection": "keep-alive",

            "Access-Control-Allow-Origin": "*"

        });

        res.write(
            `event: state\n` +
            `data: ${JSON.stringify({
                type: "state",
                data
            })}\n\n`
        );

        clients.add(res);

        req.on("close", () => {
            clients.delete(res);
        });

        return;
    }


    /* CREATE DEVICE */

    if (
        method === "POST" &&
        pathname === "/api/devices"
    ) {

        try {

            const body = await readBody(req);

            const device = {

                id: generateId(),

                name: clean(body.name),

                position: clean(body.position),

                mac: clean(body.mac),

                ssid: clean(body.ssid),

                model: clean(body.model),

                ip: clean(body.ip),

                created:
                    new Date().toISOString()

            };


            if (
                !device.name ||
                !device.position ||
                !device.mac ||
                !device.ssid ||
                !device.model ||
                !device.ip
            ) {

                return jsonResponse(
                    res,
                    400,
                    {
                        error:
                            "Tous les champs sont obligatoires."
                    }
                );
            }


            const macExists =
                data.devices.some(
                    d =>
                        d.mac.toLowerCase() ===
                        device.mac.toLowerCase()
                );

            if (macExists) {

                return jsonResponse(
                    res,
                    409,
                    {
                        error:
                            "Cette adresse MAC existe déjà."
                    }
                );
            }


            data.devices.push(device);

            saveData();
            broadcast();

            return jsonResponse(
                res,
                201,
                device
            );

        } catch (error) {

            return jsonResponse(
                res,
                400,
                {
                    error: error.message
                }
            );
        }
    }


    /* DELETE DEVICE */

    if (
        method === "DELETE" &&
        pathname.startsWith("/api/devices/")
    ) {

        const id =
            pathname.split("/").pop();

        const device =
            getDevice(id);

        if (!device) {

            return jsonResponse(
                res,
                404,
                {
                    error: "Appareil introuvable."
                }
            );
        }


        const activeTicket =
            activeTicketForDevice(id);

        if (activeTicket) {

            return jsonResponse(
                res,
                409,
                {
                    error:
                        "Impossible de supprimer un appareil avec un ticket actif."
                }
            );
        }


        data.devices =
            data.devices.filter(
                d => d.id !== id
            );

        saveData();
        broadcast();

        return jsonResponse(
            res,
            200,
            { success: true }
        );
    }


    /* CREATE TICKET */

    if (
        method === "POST" &&
        pathname === "/api/tickets"
    ) {

        try {

            const body = await readBody(req);

            const device =
                getDevice(body.deviceId);

            if (!device) {

                return jsonResponse(
                    res,
                    404,
                    {
                        error:
                            "Appareil introuvable."
                    }
                );
            }


            const existing =
                activeTicketForDevice(device.id);

            if (existing) {

                return jsonResponse(
                    res,
                    409,
                    {
                        error:
                            `Un ticket est déjà actif : #${existing.number}`
                    }
                );
            }


            const ticket = {

                number:
                    generateTicketNumber(),

                deviceId:
                    device.id,

                deviceName:
                    device.name,

                model:
                    device.model,

                ssid:
                    device.ssid,

                ip:
                    device.ip,

                mac:
                    device.mac,

                name:
                    clean(body.name),

                position:
                    clean(body.position),

                reason:
                    clean(body.reason, 1000),

                pingMention:
                    clean(body.pingMention),

                status:
                    "OPEN",

                created:
                    new Date().toISOString(),

                updated:
                    new Date().toISOString()

            };


            if (
                !ticket.name ||
                !ticket.position ||
                !ticket.reason
            ) {

                return jsonResponse(
                    res,
                    400,
                    {
                        error:
                            "Nom, position et raison obligatoires."
                    }
                );
            }


            data.tickets.unshift(ticket);

            saveData();
            broadcast();

            return jsonResponse(
                res,
                201,
                ticket
            );

        } catch (error) {

            return jsonResponse(
                res,
                400,
                {
                    error: error.message
                }
            );
        }
    }


    /* CHANGE TICKET STATUS */

    const statusMatch =
        pathname.match(
            /^\/api\/tickets\/([^/]+)\/status$/
        );

    if (
        method === "PATCH" &&
        statusMatch
    ) {

        const number =
            statusMatch[1];

        const ticket =
            data.tickets.find(
                t => t.number === number
            );

        if (!ticket) {

            return jsonResponse(
                res,
                404,
                {
                    error:
                        "Ticket introuvable."
                }
            );
        }


        try {

            const body = await readBody(req);

            const allowed = [
                "OPEN",
                "TESTING",
                "PERSIST",
                "CLOSED"
            ];

            if (
                !allowed.includes(body.status)
            ) {

                return jsonResponse(
                    res,
                    400,
                    {
                        error:
                            "Statut invalide."
                    }
                );
            }


            ticket.status =
                body.status;

            ticket.updated =
                new Date().toISOString();


            if (body.status === "PERSIST") {

                ticket.newDownload =
                    clean(body.newDownload);

                ticket.newUpload =
                    clean(body.newUpload);

                ticket.newPing =
                    clean(body.newPing);

                ticket.note =
                    clean(body.note, 1000);
            }


            saveData();
            broadcast();

            return jsonResponse(
                res,
                200,
                ticket
            );

        } catch (error) {

            return jsonResponse(
                res,
                400,
                {
                    error: error.message
                }
            );
        }
    }


    /* NOT FOUND */

    return jsonResponse(
        res,
        404,
        {
            error: "API endpoint introuvable."
        }
    );
}


/* --------------------------------------------------
   STATIC FILES
-------------------------------------------------- */

const mimeTypes = {

    ".html": "text/html; charset=utf-8",

    ".css": "text/css; charset=utf-8",

    ".js": "text/javascript; charset=utf-8",

    ".json": "application/json; charset=utf-8",

    ".svg": "image/svg+xml",

    ".png": "image/png",

    ".jpg": "image/jpeg"

};


function serveStatic(req, res) {

    let pathname =
        decodeURIComponent(
            new URL(
                req.url,
                `http://${req.headers.host}`
            ).pathname
        );

    if (pathname === "/") {
        pathname = "/dashboard.html";
    }

    const filePath =
        path.normalize(
            path.join(
                PUBLIC_DIR,
                pathname
            )
        );

    if (
        !filePath.startsWith(
            path.normalize(PUBLIC_DIR + path.sep)
        )
    ) {

        res.writeHead(403);
        res.end("Forbidden");
        return;
    }


    fs.readFile(filePath, (error, content) => {

        if (error) {

            res.writeHead(404, {
                "Content-Type":
                    "text/plain; charset=utf-8"
            });

            res.end("Page introuvable.");

            return;
        }


        const ext =
            path.extname(filePath);

        res.writeHead(200, {

            "Content-Type":
                mimeTypes[ext]
                || "application/octet-stream",

            "Cache-Control":
                "no-cache"

        });

        res.end(content);

    });
}


/* --------------------------------------------------
   SERVER
-------------------------------------------------- */

const server =
    http.createServer(
        async (req, res) => {

            if (
                req.url.startsWith("/api/")
            ) {

                await api(req, res);

            } else {

                serveStatic(req, res);

            }

        }
    );


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "=================================="
        );
        console.log(
            "   NETWORK TICKET CENTER"
        );
        console.log(
            "=================================="
        );
        console.log(
            `http://localhost:${PORT}`
        );
        console.log("");
    }
);