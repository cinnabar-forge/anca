import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { CINNABAR_PROJECT_VERSION } from "../shared/cinnabar.js";
import config from "./config.js";
import routes_v1 from "./routes/server.js";
import web from "./routes/web.js";

const app = express();
const maxRequestBodySize = "200mb";

app.use(cookieParser());
app.use(express.urlencoded({ limit: maxRequestBodySize, extended: true }));
app.use(express.json({ limit: maxRequestBodySize }));
app.use(cors());

if (config.devDisableWeb) {
  app.use("/", routes_v1());
} else {
  app.use("/api/v1", routes_v1());
  app.use("/", web());
}

const getAddresses = (prefix: string, port: number): string[] => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const [intrerfaceName, interfaceData] of Object.entries(interfaces)) {
    if (interfaceData != null) {
      for (const addressData of interfaceData) {
        if (addressData.family === "IPv4") {
          const address =
            addressData.address === "127.0.0.1"
              ? "localhost"
              : addressData.address;
          addresses.push(`- ${intrerfaceName}: ${prefix}${address}:${port}`);
        }
      }
    }
  }
  return addresses;
};

if (
  config.sslEnabled &&
  config.sslKeyPath != null &&
  config.sslCertPath != null
) {
  const options = {
    key: fs.readFileSync(config.sslKeyPath),
    cert: fs.readFileSync(config.sslCertPath)
  };

  https.createServer(options, app).listen(config.port, () => {
    console.log(
      `Anca v${CINNABAR_PROJECT_VERSION} HTTPS server is ready and can be accessed through networks:\n${getAddresses(
        "https://",
        config.port
      ).join("\n")}`
    );
    if (process?.send != null) {
      process.send("ready");
    }
  });
} else {
  app.listen(config.port, () => {
    console.log(
      `Anca v${CINNABAR_PROJECT_VERSION} HTTP server is ready and can be accessed through networks:\n${getAddresses(
        "http://",
        config.port
      ).join("\n")}`
    );
    if (process?.send != null) {
      process.send("ready");
    }
  });
}
