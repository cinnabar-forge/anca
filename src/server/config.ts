import dotenv from "dotenv";

dotenv.config();

interface Config {
  devDisableWeb: boolean;
  devWebHost: string | null;
  devWebPort: number;
  devWebUri: string | null;
  instanceName: string | null;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcIssuerAuthorizeUri: string | null;
  oidcIssuerAutodiscoverUri: string | null;
  oidcIssuerPayloadSub: string | "sub";
  oidcIssuerPayloadName: string | "name";
  oidcIssuerResourceUri: string | null;
  oidcIssuerTokenUri: string | null;
  oidcRedirectUri: string;
  oidcScope: string;
  port: number;
  sessionExpireTime: number;
  sessionRefreshTime: number;
  sslCertPath: string | null;
  sslEnabled: boolean;
  sslKeyPath: string | null;
}

function parseConfig(): Config {
  if (
    !process.env.ANCA_OIDC_ISSUER_AUTODISCOVER_URI &&
    !process.env.ANCA_OIDC_ISSUER_AUTHORIZE_URI &&
    !process.env.ANCA_OIDC_ISSUER_TOKEN_URI
  ) {
    console.log(
      "[WARNING] ANCA_OIDC_ISSUER_AUTODISCOVER_URI/ANCA_OIDC_ISSUER_AUTHORIZE_URI/ANCA_OIDC_ISSUER_TOKEN_URI is not set. OIDC authentication will not work."
    );
  }

  if (
    !process.env.ANCA_OIDC_CLIENT_ID ||
    !process.env.ANCA_OIDC_CLIENT_SECRET
  ) {
    console.log(
      "[WARNING] ANCA_OIDC_CLIENT_ID or ANCA_OIDC_CLIENT_SECRET is not set. OIDC authentication will not work."
    );
  }

  const env: Config = {
    devDisableWeb: process.env.ANCA_DEV_DISABLE_WEB === "true",
    devWebHost: process.env.ANCA_DEV_WEB_HOST ?? null,
    devWebPort:
      process.env.ANCA_DEV_WEB_PORT != null
        ? Number(process.env.ANCA_DEV_WEB_PORT)
        : 55000,
    devWebUri: process.env.ANCA_DEV_WEB_URI ?? null,
    instanceName: process.env.ANCA_INSTANCE_NAME ?? null,
    oidcClientId: process.env.ANCA_OIDC_CLIENT_ID ?? "",
    oidcClientSecret: process.env.ANCA_OIDC_CLIENT_SECRET ?? "",
    oidcIssuerAuthorizeUri: process.env.ANCA_OIDC_ISSUER_AUTHORIZE_URI ?? null,
    oidcIssuerAutodiscoverUri:
      process.env.ANCA_OIDC_ISSUER_AUTODISCOVER_URI ?? null,
    oidcIssuerPayloadSub: process.env.ANCA_OIDC_ISSUER_PAYLOAD_SUB ?? "sub",
    oidcIssuerPayloadName: process.env.ANCA_OIDC_ISSUER_PAYLOAD_NAME ?? "name",
    oidcIssuerResourceUri: process.env.ANCA_OIDC_ISSUER_RESOURCE_URI ?? null,
    oidcIssuerTokenUri: process.env.ANCA_OIDC_ISSUER_TOKEN_URI ?? null,
    oidcRedirectUri:
      process.env.ANCA_OIDC_REDIRECT_URI ??
      "http://localhost:3000/auth/callback",
    oidcScope: process.env.ANCA_OIDC_SCOPE ?? "openid profile email",
    port: process.env.ANCA_PORT != null ? Number(process.env.ANCA_PORT) : 3000,
    sessionExpireTime: process.env.ANCA_SESSION_EXPIRE_TIME
      ? Number(process.env.ANCA_SESSION_EXPIRE_TIME)
      : 86400,
    sessionRefreshTime: process.env.ANCA_SESSION_REFRESH_TIME
      ? Number(process.env.ANCA_SESSION_REFRESH_TIME)
      : 300,
    sslCertPath: process.env.ANCA_SSL_CERT_PATH ?? null,
    sslEnabled: process.env.ANCA_SSL_ENABLED === "true",
    sslKeyPath: process.env.ANCA_SSL_KEY_PATH ?? null
  };

  return env;
}

const config: Config = parseConfig();

export default config;
