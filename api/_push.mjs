// Web Push without dependencies: VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291),
// using node:crypto. Used by api/nudge.mjs (the leading _ keeps Vercel from serving this file as an endpoint). Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
// (base64url: the uncompressed public point and the private scalar).

import crypto from "node:crypto";

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const unb64 = (s) => Buffer.from(s, "base64url");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

function vapidKey() {
  const pub = unb64(process.env.VAPID_PUBLIC_KEY);
  return crypto.createPrivateKey({
    format: "jwk",
    key: { kty: "EC", crv: "P-256", d: process.env.VAPID_PRIVATE_KEY, x: b64(pub.subarray(1, 33)), y: b64(pub.subarray(33, 65)) },
  });
}

function vapidHeader(endpoint) {
  const header = b64(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: "https://mimi-arigato.vercel.app",
  }));
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${claims}`), { key: vapidKey(), dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64(signature)}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

// The encrypted body for one subscription ({ p256dh, auth }).
function encrypt(payload, { p256dh, auth }) {
  const uaPublic = unb64(p256dh);
  const ecdh = crypto.createECDH("prime256v1");
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);
  const ikm = hmac(hmac(unb64(auth), shared), Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic, Buffer.from([1])]));
  const salt = crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01")).subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const sealed = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, sealed]);
}

// Sends one notification. Returns the push service's status (201 = sent; 404/410 = gone).
export async function sendPush(subscription, message) {
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      authorization: vapidHeader(subscription.endpoint),
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: "43200",
      urgency: "normal",
    },
    body: encrypt(JSON.stringify(message), subscription),
    signal: AbortSignal.timeout(10_000),
  });
  return res.status;
}
