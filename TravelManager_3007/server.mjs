import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 3007);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8"
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function internetRequest(url, timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();

    const req = https.get(
      url,
      {
        timeout,
        headers: {
          "User-Agent": "TravelManager3007/1.0"
        }
      },
      (response) => {
        const elapsed = Date.now() - start;

        response.resume();

        response.on("end", () => {
          resolve({
            ok: true,
            status: response.statusCode,
            latency: elapsed
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });

    req.on("error", (error) => {
      resolve({
        ok: false,
        error: error.message,
        latency: Date.now() - start
      });
    });
  });
}

/*
 * VRAI TEST INTERNET
 *
 * On ne regarde PAS navigator.onLine.
 * Le serveur fait réellement plusieurs requêtes HTTPS
 * vers Internet.
 */
async function checkInternet() {
  const tests = [
    {
      name: "Google",
      url: "https://www.google.com/generate_204"
    },
    {
      name: "Cloudflare",
      url: "https://1.1.1.1/cdn-cgi/trace"
    },
    {
      name: "Wikimedia",
      url: "https://www.wikipedia.org/"
    }
  ];

  const results = await Promise.all(
    tests.map(async (test) => {
      const result = await internetRequest(test.url);

      return {
        name: test.name,
        ...result
      };
    })
  );

  const successful = results.filter((r) => r.ok);

  return {
    internet: successful.length > 0,
    testedAt: new Date().toISOString(),
    successfulTests: successful.length,
    totalTests: results.length,
    latency: successful.length
      ? Math.min(...successful.map((r) => r.latency))
      : null,
    tests: results
  };
}

function fetchJson(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        timeout,
        headers: {
          "User-Agent": "TravelManager3007/1.0",
          Accept: "application/json"
        }
      },
      (response) => {
        let data = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              new Error(`HTTP ${response.statusCode}`)
            );
            return;
          }

          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Réponse JSON invalide"));
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });

    req.on("error", reject);
  });
}

/*
 * Géocodage OpenStreetMap / Nominatim
 */
async function geocode(place) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=json&limit=5&q=${encodeURIComponent(place)}`;

  const data = await fetchJson(url);

  return data.map((item) => ({
    name: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    type: item.type,
    osmId: item.osm_id
  }));
}

/*
 * Météo Open-Meteo
 * Pas de clé API nécessaire.
 */
async function weather(latitude, longitude) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(latitude)}` +
    `&longitude=${encodeURIComponent(longitude)}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature," +
    "precipitation,rain,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min," +
    "precipitation_probability_max,sunrise,sunset" +
    "&timezone=auto";

  return fetchJson(url);
}

function safeFilePath(urlPath) {
  let pathname;

  try {
    pathname = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }

  if (pathname === "/") pathname = "/index.html";

  const normalized = path.normalize(pathname);

  if (normalized.includes("..")) {
    return null;
  }

  const filePath = path.join(__dirname, normalized);

  if (!filePath.startsWith(__dirname)) {
    return null;
  }

  return filePath;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsed = new URL(
      req.url,
      `http://${req.headers.host || "localhost"}`
    );

    /*
     * API : vrai test Internet
     */
    if (
      req.method === "GET" &&
      parsed.pathname === "/api/internet-check"
    ) {
      const result = await checkInternet();
      json(res, 200, result);
      return;
    }

    /*
     * API : météo
     */
    if (
      req.method === "GET" &&
      parsed.pathname === "/api/weather"
    ) {
      const latitude = parsed.searchParams.get("lat");
      const longitude = parsed.searchParams.get("lon");

      if (!latitude || !longitude) {
        json(res, 400, {
          error: "latitude et longitude sont obligatoires"
        });
        return;
      }

      try {
        const result = await weather(latitude, longitude);

        json(res, 200, {
          ok: true,
          data: result
        });
      } catch (error) {
        json(res, 502, {
          ok: false,
          error: error.message
        });
      }

      return;
    }

    /*
     * API : géocodage
     */
    if (
      req.method === "GET" &&
      parsed.pathname === "/api/geocode"
    ) {
      const place = parsed.searchParams.get("q");

      if (!place) {
        json(res, 400, {
          error: "q est obligatoire"
        });
        return;
      }

      try {
        const result = await geocode(place);

        json(res, 200, {
          ok: true,
          results: result
        });
      } catch (error) {
        json(res, 502, {
          ok: false,
          error: error.message
        });
      }

      return;
    }

    /*
     * API : informations serveur
     */
    if (
      req.method === "GET" &&
      parsed.pathname === "/api/status"
    ) {
      json(res, 200, {
        application: "Travel Manager 3007",
        version: "1.0.0",
        node: process.version,
        platform: process.platform,
        hostname: process.hostname,
        uptime: process.uptime(),
        time: new Date().toISOString()
      });

      return;
    }

    /*
     * Fichiers statiques
     */
    const filePath = safeFilePath(parsed.pathname);

    if (!filePath) {
      send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        send(
          res,
          404,
          "404 - Page introuvable",
          "text/plain; charset=utf-8"
        );
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || "application/octet-stream";

      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "no-cache"
      });

      fs.createReadStream(filePath).pipe(res);
    });
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      json(res, 500, {
        error: "Erreur interne du serveur",
        details: error.message
      });
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("==============================================");
  console.log("       TRAVEL MANAGER 3007");
  console.log("==============================================");
  console.log(`Serveur : http://${HOST}:${PORT}`);
  console.log(`Port    : ${PORT}`);
  console.log("Internet check : /api/internet-check");
  console.log("Météo          : /api/weather");
  console.log("Géocodage      : /api/geocode");
  console.log("==============================================");
  console.log("");
});

process.on("SIGINT", () => {
  console.log("\nArrêt du serveur...");
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});