import axios from "axios";
import jwt from "jsonwebtoken";
import { ulid } from "ulid";
import { type AuthDto } from "../../shared/types.js";
import config from "../config.js";
import { generateRandomSecureString, hashString } from "../utils/token.js";

const sessions: { [key: string]: { sessionId: string; authorId: string; name: string; destroyAt: number; expireAt: number } } = {};

async function autodiscoverOidc() {
  if (config.oidcIssuerAutodiscoverUri == null) {
    return null;
  }
  const response = await axios.get<{
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
  }>(config.oidcIssuerAutodiscoverUri);
  if (
    response.data.authorization_endpoint == null ||
    response.data.token_endpoint == null
  ) {
    return null;
  }
  return {
    authorizeUri: response.data.authorization_endpoint,
    tokenUri: response.data.token_endpoint,
    resourceUri: response.data.userinfo_endpoint
  };
}

export async function getOidcRedirectHtmlMarkup(): Promise<string> {
  let authorizeUri: string | undefined;

  if (config.oidcIssuerAutodiscoverUri != null) {
    const discovered = await autodiscoverOidc();
    if (discovered != null) {
      authorizeUri = discovered.authorizeUri;
    }
  } else if (config.oidcIssuerAuthorizeUri != null) {
    authorizeUri = config.oidcIssuerAuthorizeUri;
  }

  if (authorizeUri == null) {
    throw new Error("no authorizeUri");
  }

  const authUrl = `${authorizeUri}?response_type=code&client_id=${config.oidcClientId}&redirect_uri=${encodeURIComponent(config.oidcRedirectUri)}&scope=${config.oidcScope}&state=${generateRandomSecureString()}&nonce=${generateRandomSecureString()}`;
  return `<html><head><meta http-equiv="refresh" content="0;url=${authUrl}" /></head></html>`;
}

export async function processOidcResponse(
  code: string,
  state: string
): Promise<string> {
  let tokenUri: string | undefined;
  let resourceUri: string | undefined;

  if (config.oidcIssuerAutodiscoverUri != null) {
    const discovered = await autodiscoverOidc();
    if (discovered != null) {
      tokenUri = discovered.tokenUri;
      resourceUri = discovered.resourceUri;
    }
  } else {
    if (config.oidcIssuerTokenUri != null) {
      tokenUri = config.oidcIssuerTokenUri;
    }
    if (config.oidcIssuerResourceUri != null) {
      resourceUri = config.oidcIssuerResourceUri;
    }
  }

  if (tokenUri == null) {
    throw new Error("no tokenUri");
  }

  const response = await axios.post(
    tokenUri,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.oidcRedirectUri,
      client_id: config.oidcClientId,
      client_secret: config.oidcClientSecret,
      state
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      }
    }
  );

  let payload: { sub: string; name: string } | null = null;

  if (resourceUri != null) {
    const accessToken = response.data.access_token;
    const resourceResponse = await axios.get(resourceUri, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    payload = resourceResponse.data;
  } else {
    payload = jwt.decode(response.data.id_token) as null | {
      sub: string;
      name: string;
    };
  }

  if (!payload) {
    throw new Error("Payload is missing");
  }

  const subClaim =
    payload[config.oidcIssuerPayloadSub] != null
      ? String(payload[config.oidcIssuerPayloadSub])
      : null;

  if (!subClaim) {
    throw new Error(
      `Missing '${config.oidcIssuerPayloadSub}' claim in payload`
    );
  }

  const nameClaim = payload[config.oidcIssuerPayloadName] ?? subClaim;

  const currentDate = Math.floor(Date.now() / 1000);

  let author = {
    name: nameClaim,
    uuid: subClaim,
    createdTimestamp: currentDate
  };

  const sessionToken = generateRandomSecureString();
  const sessionTokenHash = hashString(sessionToken);

  const sessionId = ulid();

  sessions[sessionTokenHash] = {
    sessionId,
    authorId: author.uuid,
    name: author.name,
    destroyAt: currentDate + config.sessionExpireTime,
    expireAt: currentDate + config.sessionRefreshTime
  };

  console.log(
    "[processOidcResponse]",
    `session ${sessionId} (${author.name}, ID: ${author.uuid})`,
    "has been created,",
    "expire in",
    config.sessionRefreshTime,
    "destroy in",
    config.sessionExpireTime
  );

  return sessionToken;
}

export async function verifySessionToken(
  sessionToken: string
): Promise<{ authDto: AuthDto; sessionToken?: string | null } | null> {
  const sessionTokenHash = hashString(sessionToken);

  const currentDate = Math.floor(Date.now() / 1000);

  const session = sessions[sessionTokenHash];

  if (!session) {
    return null;
  }

  let updatedSessionToken: string | null = null;

  if (currentDate >= session.destroyAt) {
    console.log(
      "[verifySessionToken]",
      `session ${session.sessionId} (${session.name}, ID: ${session.authorId})`,
      "is expired and is going to be destroyed"
    );
    return null;
  }
  if (currentDate >= session.expireAt) {
    updatedSessionToken = generateRandomSecureString();
    const updatedSessionTokenHash = hashString(updatedSessionToken);

    sessions[updatedSessionTokenHash] = {
      sessionId: session.sessionId,
      authorId: session.authorId,
      name: session.name,
      destroyAt: currentDate + config.sessionExpireTime,
      expireAt: currentDate + config.sessionRefreshTime
    };
    console.log(
      "[verifySessionToken]",
      `session ${session.sessionId} (${session.name}, ID: ${session.authorId})`,
      "has been prolonged,",
      "expire in",
      config.sessionRefreshTime,
      "destroy in",
      config.sessionExpireTime
    );
  }

  const authorName = session.name ?? `Author ${session.authorId}`;

  return {
    authDto: {
      name: authorName
    },
    sessionToken: updatedSessionToken
  };
}
