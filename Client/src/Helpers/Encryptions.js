import { bech32 } from "bech32";
import { Buffer } from "buffer";
import * as secp from "@noble/secp256k1";
import { decode } from "light-bolt11-decoder";

const LNURL_REGEX =
  /^(?:http.*[&?]lightning=|lightning:)?(lnurl[0-9]{1,}[02-9ac-hj-np-z]+)/;
const LN_ADDRESS_REGEX =
  /^((?:[^<>()\[\]\\.,;:\s@"]+(?:\.[^<>()\[\]\\.,;:\s@"]+)*)|(?:".+"))@((?:\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(?:(?:[a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const LNURLP_REGEX =
  /^lnurlp:\/\/([\w-]+\.)+[\w-]+(:\d{1,5})?(\/[\w-.\/?%&=]*)?$/;

const getBech32 = (prefix, key) => {
  let buff = secp.utils.hexToBytes(key);
  return bech32.encode(prefix, bech32.toWords(buff));
};
const getHex = (key) => {
  return secp.utils.bytesToHex(
    Uint8Array.from(bech32.fromWords(bech32.decode(key).words))
  );
};
const shortenKey = (key) => {
  let firstHalf = key.substring(0, 10);
  let secondHalf = key.substring(key.length - 10, key.length);
  return `${firstHalf}....${secondHalf}`;
};
const minimizeKey = (key) => {
  return key.substring(key.length - 10, key.length);
};

const getEmptyNostrUser = (pubkey) => {
  return {
    name: getBech32("npub", pubkey).substring(0, 10),
    img: "",

    cover: "",
    about: "",
    lud06: "",
    lud16: "",

    joining_date: new Date(Date.now() / 1000).toISOString(),
    nip05: "",

    content: `{"name": ""}`,
    created_at: Date.now() / 1000,
    pubkey,
  };
};

const decodeUrlOrAddress = (lnUrlOrAddress) => {
  const bech32Url = parseLnUrl(lnUrlOrAddress);
  if (bech32Url) {
    const decoded = bech32.decode(bech32Url, 20000);
    return Buffer.from(bech32.fromWords(decoded.words)).toString();
  }

  const address = parseLightningAddress(lnUrlOrAddress);
  if (address) {
    const { username, domain } = address;
    const protocol = domain.match(/\.onion$/) ? "http" : "https";
    return `${protocol}://${domain}/.well-known/lnurlp/${username}`;
  }

  return parseLnurlp(lnUrlOrAddress);
};

const parseLnUrl = (url) => {
  if (!url) return null;
  const result = LNURL_REGEX.exec(url.toLowerCase());
  return result ? result[1] : null;
};

const parseLightningAddress = (address) => {
  if (!address) return null;
  const result = LN_ADDRESS_REGEX.exec(address);
  return result ? { username: result[1], domain: result[2] } : null;
};

const parseLnurlp = (url) => {
  if (!url) return null;

  const parsedUrl = url.toLowerCase();
  if (!LNURLP_REGEX.test(parsedUrl)) return null;

  const protocol = parsedUrl.includes(".onion") ? "http://" : "https://";
  return parsedUrl.replace("lnurlp://", protocol);
};

const encodeLud06 = (url) => {
  try {
    let words = bech32.toWords(Buffer.from(url, "utf8"));
    let newConvertedAddress = bech32.encode("lnurl", words, 2000);
    return newConvertedAddress;
  } catch {
    return false;
  }
};

const getParsedAuthor = (data) => {
  let content = JSON.parse(data.content) || {};
  let tempAuthor = {
    name: content?.name || data.pubkey.substring(0, 10),
    img: content?.picture || "",
    pubkey: data.pubkey,
    cover: content?.banner || "",
    about: content?.about || "",
    lud06: content?.lud06 || "",
    lud16: content?.lud16 || "",
    pubkeyhashed: getBech32("npub", data.pubkey),
    joining_date: new Date(data.created_at * 1000).toISOString(),
    nip05: content?.nip05 || "",
  };
  return tempAuthor;
};

const decodeBolt11 = (address) => {
  let decoded = decode(address);
  let amount = decoded.sections.find((item) => item.name === "amount");
  return amount.value / 1000;
};
const getBolt11 = (event) => {
  if (!event) return "";

  for (let tag of event.tags) {
    if (tag[0] === "bolt11") return tag[1];
  }
  return "";
};
const getZapper = (event) => {
  if (!event) return "";
  let sats = decodeBolt11(getBolt11(event));
  for (let tag of event.tags) {
    if (tag[0] === "description")
      return { ...JSON.parse(tag[1]), amount: sats };
  }
  return "";
};

export {
  getBech32,
  shortenKey,
  getParsedAuthor,
  getHex,
  getEmptyNostrUser,
  minimizeKey,
  decodeUrlOrAddress,
  encodeLud06,
  getBolt11,
  decodeBolt11,
  getZapper,
};
