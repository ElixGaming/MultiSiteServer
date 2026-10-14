
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3008;
const HOST = "0.0.0.0";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

async function check(url) {
    const start = Date.now();

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            redirect: "follow"
        });

        return {
            ok: response.status >= 200 && response.status < 500,
            status: response.status,
            ms: Date.now() - start
        };
    } catch (error) {
        return {
            ok: false,
            error: error.cause?.code || error.message,
            ms: Date.now() - start
        };
    }
}

function sendJSON(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method !== "GET") {
        return sendJSON(res, 405, { error: "Méthode non autorisée" });
    }

    if (url.pathname === "/api/internet") {
        const [google, cloudflare] = await Promise.all([
            check("https://www.google.com/generate_204"),
            check("https://www.cloudflare.com/cdn-cgi/trace")
        ]);

        return sendJSON(res, 200, {
            ok: google.ok || cloudflare.ok,
            checks: { google, cloudflare },
            time: new Date().toISOString()
        });
    }

    if (url.pathname === "/api/site") {
        let target;

        try {
            target = new URL(url.searchParams.get("url") || "");
        } catch {
            return sendJSON(res, 400, {
                ok: false,
                error: "Adresse invalide. Exemple : https://example.com"
            });
        }

        if (!["http:", "https:"].includes(target.protocol)) {
            return sendJSON(res, 400, {
                ok: false,
                error: "Seules les adresses HTTP et HTTPS sont acceptées."
            });
        }

        return sendJSON(res, 200, await check(target.href));
    }

    const files = {
        "/": "index.html",
        "/index.html": "index.html",
        "/style.css": "style.css",
        "/script.js": "script.js"
    };

    const filename = files[url.pathname];

    if (!filename) {
        return sendJSON(res, 404, { error: "Page introuvable" });
    }

    const filepath = path.join(ROOT, filename);
    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8"
    };

    fs.readFile(filepath, (error, content) => {
        if (error) {
            res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("Fichier manquant : " + filename);
        }

        res.writeHead(200, {
            "Content-Type": contentTypes[path.extname(filepath)],
            "X-Content-Type-Options": "nosniff"
        });

        res.end(content);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Internet Check disponible sur http://localhost:${PORT}`);
});
