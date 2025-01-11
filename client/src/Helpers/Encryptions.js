import { bech32 } from "bech32";
import { Buffer } from "buffer";
import { nip04, nip44 } from "nostr-tools";
import * as secp from "@noble/secp256k1";
import { decode } from "light-bolt11-decoder";
import { getImagePlaceholder } from "../Content/NostrPPPlaceholder";
import CryptoJS from "crypto-js";

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
const bytesTohex = (arrayBuffer) => {
  const byteToHex = [];

  for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, "0");
    byteToHex.push(hexOctet);
  }
  const buff = new Uint8Array(arrayBuffer);
  const hexOctets = [];

  for (let i = 0; i < buff.length; ++i) hexOctets.push(byteToHex[buff[i]]);

  return hexOctets.join("");
};
const shortenKey = (key) => {
  let firstHalf = key.substring(0, 10);
  let secondHalf = key.substring(key.length - 10, key.length);
  return `${firstHalf}....${secondHalf}`;
};
const minimizeKey = (key) => {
  if (!key) return key;
  return key.substring(key.length - 10, key.length);
};

const getEmptyNostrUser = (pubkey) => {
  return {
    display_name: getBech32("npub", pubkey).substring(0, 10),
    name: getBech32("npub", pubkey).substring(0, 10),
    picture: "",
    banner: "",
    about: "",
    lud06: "",
    lud16: "",
    joining_date: new Date(Date.now() / 1000).toISOString(),
    nip05: "",
    content: `{"name": ""}`,
    created_at: Date.now() / 1000,
    pubkey,
    pubkeyhashed: getBech32("npub", pubkey),
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
    display_name:
      content?.display_name || content?.name || data.pubkey.substring(0, 10),
    name:
      content?.name || content?.display_name || data.pubkey.substring(0, 10),
    picture: content?.picture || "",
    pubkey: data.pubkey,
    banner: content?.banner || getImagePlaceholder(),
    about: content?.about || "",
    lud06: content?.lud06 || "",
    lud16: content?.lud16 || "",
    website: content?.website || "",
    pubkeyhashed: getBech32("npub", data.pubkey),
    joining_date: new Date(data.created_at * 1000).toISOString(),
    nip05: content?.nip05 || "",
  };
  return tempAuthor;
};
const getParsed3000xContent = (tags) => {
  try {
    let content = {
      title: "Untitled",
      description: "",
      image: "",
      published_at: "",
      d: "",
      client: "",
      items: [],
    };
    for (let tag of tags) {
      if (tag[0] === "title") {
        content.title = tag[1];
      }
      if (["image", "thumbnail", "thumb"].includes(tag[0])) {
        content.image = tag[1];
      }
      if (["description", "excerpt", "summary"].includes(tag[0])) {
        content.description = tag[1];
      }
      if (tag[0] === "d") {
        content.d = tag[1];
      }
      if (tag[0] === "published_at") {
        content.published_at = tag[1];
      }
      if (tag[0] === "client") {
        if (tag.length >= 3 && tag[2].includes("31990")) {
          content.client = tag[2];
        }
        if ((tag.length >= 3 && !tag[2].includes("31990")) || tag.length < 3)
          content.client = tag[1];
      }
      if (
        tag[0] === "a" ||
        tag[0] === "e" ||
        tag[0] === "r" ||
        tag[0] === "t"
      ) {
        content.items.push(tag[1]);
      }
    }
    if (!content.image) content.image = getImagePlaceholder();

    return content;
  } catch {
    return false;
  }
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
      return { ...JSON.parse(tag[1]), amount: sats, message: event.content };
  }
  return "";
};

const checkForLUDS = (lud06, lud16) => {
  return lud16?.includes("@")
    ? encodeLud06(decodeUrlOrAddress(lud16))
    : lud06?.includes("@")
    ? encodeLud06(decodeUrlOrAddress(lud06))
    : lud06;
};

const convertDate = (toConvert) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const year = new Date(toConvert).getFullYear();
  const month = months[new Date(toConvert).getMonth()];
  const day = new Date(toConvert).getDate();

  return `${month} ${day}, ${year}`;
};

const filterRelays = (list_1, list_2) => {
  let tempArray = [...list_1, ...list_2];
  return tempArray.filter((item, index, tempArray) => {
    if (tempArray.findIndex((item_1) => item_1 === item) === index) return item;
  });
};
const removeDuplicants = (list_1, list_2 = []) => {
  let tempArray = [...list_1, ...list_2];
  return tempArray.filter((item, index, tempArray) => {
    if (tempArray.findIndex((item_1) => item_1 === item) === index) return item;
  });
};

const encryptEventData = (data) => {
  let enc = CryptoJS.AES.encrypt(
    data,
    process.env.REACT_APP_ENC_SECRET
  ).toString();
  return enc;
};
const decryptEventData = (enc, data) => {
  let dec = CryptoJS.AES.decrypt(enc, process.env.REACT_APP_ENC_SECRET);
  return {
    dec: dec.toString(CryptoJS.enc.Utf8),
    status: dec.toString(CryptoJS.enc.Utf8) == data,
  };
};

const getClaimingData = async (pubkey, event_id, kind) => {
  try {
    let message = {
      pubkey,
      event_id,
      kind,
    };
    if (!window.nostr)
      return {
        status: false,
        message:
          "You don't appear to be using any extension, please login using an extension or use Yakihonne mobile app.",
      };
    let walletPubkey = await window.nostr.getPublicKey();
    if (walletPubkey !== pubkey)
      return {
        status: false,
        message:
          "You're not authorized to claim this reward, the extension account mismatches your current Yakihonne account",
      };
    const encrypted = await window.nostr.nip04.encrypt(
      process.env.REACT_APP_YAKI_PUBKEY,
      JSON.stringify(message)
    );
    return { status: true, message: encrypted };
  } catch (err) {
    console.log(err);
    return { status: false, message: "You have cancel this operation." };
  }
};

const decrypt04 = async (event, nostrkeys) => {
  let pubkey =
    event.pubkey === nostrkeys.pub
      ? event.tags.find((tag) => tag[0] === "p")[1]
      : event.pubkey;

  let decryptedMessage = "";
  if (nostrkeys.ext) {
    decryptedMessage = await window.nostr.nip04.decrypt(pubkey, event.content);
  } else if (nostrkeys.sec) {
    decryptedMessage = await nip04.decrypt(
      nostrkeys.sec,
      pubkey,
      event.content
    );
  }
  return decryptedMessage;
};

const unwrapGiftWrap = async (event, secret) => {
  try {
    let decryptedEvent13 = secret
      ? nip44.v2.decrypt(
          event.content,
          nip44.v2.utils.getConversationKey(secret, event.pubkey)
        )
      : await window.nostr.nip44.decrypt(event.pubkey, event.content);

    let { pubkey, content } = JSON.parse(decryptedEvent13);

    let decryptedEvent14 = secret
      ? nip44.v2.decrypt(
          content,
          nip44.v2.utils.getConversationKey(secret, pubkey)
        )
      : await window.nostr.nip44.decrypt(pubkey, content);
    return JSON.parse(decryptedEvent14);
  } catch (err) {
    console.log(err);
    return false;
  }
};

const encodeBase64URL = (string) => {
  return btoa(string)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
  checkForLUDS,
  convertDate,
  filterRelays,
  removeDuplicants,
  getParsed3000xContent,
  encryptEventData,
  decryptEventData,
  getClaimingData,
  bytesTohex,
  decrypt04,
  unwrapGiftWrap,
  encodeBase64URL,
};
