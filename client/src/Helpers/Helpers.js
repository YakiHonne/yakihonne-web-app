import { nip19, nip44 } from "nostr-tools";
import { decryptEventData, getHex } from "./Encryptions";
import IMGElement from "../Components/NOSTR/IMGElement";
import axios from "axios";
import relaysOnPlatform from "../Content/Relays";
import { getImagePlaceholder } from "../Content/NostrPPPlaceholder";
import React from "react";
import Carousel from "../Components/NOSTR/Carousel";
import Nip19Parsing from "../Components/NOSTR/Nip19Parsing";

const LoginToAPI = async (publicKey, secretKey) => {
  try {
    let { pubkey, password } = await getLoginsParams(publicKey, secretKey);
    if (!(pubkey && password)) return;
    const data = await axios.post("/api/v1/login", { password, pubkey });
    return data.data;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const getLoginsParams = async (publicKey, secretKey) => {
  try {
    let content = JSON.stringify({
      pubkey: publicKey,
      sent_at: Math.floor(new Date().getTime() / 1000),
    });
    let password = secretKey
      ? nip44.default.v2.encrypt(
          content,
          nip44.v2.utils.getConversationKey(
            secretKey,
            process.env.REACT_APP_CHECKER_PUBKEY
          )
        )
      : await window.nostr.nip44.encrypt(
          process.env.REACT_APP_CHECKER_PUBKEY,
          content
        );

    return { password, pubkey: publicKey };
  } catch (err) {
    console.log(err);
    return { password: false, pubkey: false };
  }
};

const isVid = (url) => {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtu(?:\.be|be\.com)\/(?:watch\?v=|embed\/)?|vimeo\.com\/)([^\?&]+)/;

  const match = url.match(regex);

  if (match) {
    const videoId = match[1];
    let platform = "";
    if (match[0].startsWith("https://vimeo.com")) platform = "Vimeo";
    if (match[0].includes("youtu")) platform = "YouTube";

    if (platform === "YouTube") {
      return {
        isYT: true,
        videoId,
      };
    }
    if (platform === "Vimeo") {
      return {
        isYT: false,
        videoId,
      };
    }
    return false;
  }
  return false;
};

const isImageUrl = async (url) => {
  try {
    return new Promise((resolve, reject) => {
      if (/(https?:\/\/[^ ]*\.(?:gif|png|jpg|jpeg|webp))/i.test(url))
        resolve({ type: "image" });
      if (/(https?:\/\/[^ ]*\.(?:mp4))/i.test(url)) resolve({ type: "video" });
      const img = new Image();

      img.onload = () => {
        resolve({ type: "image" });
      };

      img.onerror = () => {
        resolve(false);
      };

      img.src = url;
    });
  } catch (error) {
    console.error(`Error checking URL ${url}:`, error);
    return false;
  }
};
const isImageUrlSync = (url) => {
  try {
    if (/(https?:\/\/[^ ]*\.(?:gif|png|jpg|jpeg|webp))/i.test(url)) return true;
    return false;
  } catch (error) {
    return false;
  }
};

const getNoteTree = async (note, minimal = false) => {
  if (!note) return "";
  let tree = note
    .trim()
    .split(/(\s|\n)+/)
    .filter(Boolean);
  let finalTree = [];

  for (let i = 0; i < tree.length; i++) {
    const el = tree[i];
    const key = `${el}-${i}`;
    if (el === "\n") {
      finalTree.push(<br key={key} />);
    } else if (
      /(https?:\/\/)/i.test(el) &&
      !el.includes("https://yakihonne.com/smart-widget-checker?naddr=")
    ) {
      const isURLVid = isVid(el);
      if (!minimal) {
        if (isURLVid) {
          if (isURLVid.isYT) {
            finalTree.push(
              <iframe
                key={key}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: "var(--border-r-18)",
                }}
                src={`https://www.youtube.com/embed/${isURLVid.videoId}`}
                title="justin timberlake feat. timbaland - cry me a river [ slowed + reverb ]"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            );
          }
          if (!isURLVid.isYT)
            finalTree.push(
              <iframe
                key={key}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  borderRadius: "var(--border-r-18)",
                }}
                src={`https://player.vimeo.com/video/${isURLVid.videoId}`}
                title="justin timberlake feat. timbaland - cry me a river [ slowed + reverb ]"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            );
        }
        if (!isURLVid) {
          const checkURL = await isImageUrl(el);
          if (checkURL) {
            if (checkURL.type === "image") {
              finalTree.push(<IMGElement src={el} key={key} />);
            } else if (checkURL.type === "video") {
              finalTree.push(
                <video
                  key={key}
                  controls={true}
                  autoPlay={false}
                  name="media"
                  width={"100%"}
                  className="sc-s-18"
                  style={{ margin: "1rem auto" }}
                >
                  <source src={el} type="video/mp4" />
                </video>
              );
            }
          } else if (
            el.includes(".mp3") ||
            el.includes(".ogg") ||
            el.includes(".wav")
          ) {
            finalTree.push(
              <audio
                controls
                key={key}
                className="fit-container"
                style={{ margin: ".5rem auto", minWidth: "300px" }}
              >
                <source src={el} type="audio/ogg" />
                <source src={el} type="audio/mpeg" />
                <source src={el} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            );
          } else {
            finalTree.push(
              <a
                style={{ wordBreak: "break-word", color: "var(--orange-main)" }}
                href={el}
                className="btn-text-gray"
                key={key}
                onClick={(e) => e.stopPropagation()}
              >
                {el}
              </a>
            );
          }
        }
      } else
        finalTree.push(
          <a
            style={{ wordBreak: "break-word", color: "var(--orange-main)" }}
            href={el}
            className="btn-text-gray"
            key={key}
            onClick={(e) => e.stopPropagation()}
          >
            {el}
          </a>
        );
    } else if (
      (el.includes("nostr:") ||
        el.includes("naddr") ||
        el.includes("https://yakihonne.com/smart-widget-checker?naddr=") ||
        el.includes("nprofile") ||
        el.includes("npub") ||
        el.includes("nevent")) &&
      el.length > 30
    ) {
      const nip19add = el
        .replace("https://yakihonne.com/smart-widget-checker?naddr=", "")
        .replace("nostr:", "")
        .replace("@", "")
        .replace(".", "")
        .replace(",", "");

      finalTree.push(
        <Nip19Parsing addr={nip19add} key={key} minimal={minimal} />
      );
    } else if (el.startsWith("#")) {
      finalTree.push(
        <a
          style={{ wordBreak: "break-word", color: "var(--orange-main)" }}
          href={`/tags/${el.replace("#", "")}`}
          className="btn-text-gray"
          key={key}
          onClick={(e) => e.stopPropagation()}
        >
          {el}
        </a>
      );
    } else {
      finalTree.push(
        <span
          style={{
            wordBreak: "break-word",
            color: "var(--dark-gray)",
          }}
          key={key}
        >
          {el}
        </span>
      );
    }
  }
  return mergeConsecutivePElements(finalTree);
};

const getLinkFromAddr = (addr) => {
  try {
    if (addr.startsWith("naddr")) {
      let data = nip19.decode(addr);

      if (data.data.kind === 30023) return `/article/${addr}`;
      if (data.data.kind === 30004) return `/curations/${addr}`;
      if (data.data.kind === 34235 || data.data.kind === 34236)
        return `/videos/${addr}`;
      if (data.data.kind === 30031)
        return `/smart-widget-checker?naddr=${addr}`;
    }
    if (addr.startsWith("nprofile")) {
      return `/users/${addr}`;
    }
    if (addr.startsWith("npub")) {
      let hex = getHex(addr.replace(",", "").replace(".", ""));
      return `/users/${nip19.nprofileEncode({ pubkey: hex })}`;
    }
    if (addr.startsWith("nevent") || addr.startsWith("note")) {
      let data = nip19.decode(addr);
      return `/notes/${nip19.neventEncode({
        author: data.data.author,
        id: data.data.id,
      })}`;
    }

    return addr;
  } catch (err) {
    return addr;
  }
};

const getNIP21FromURL = (url) => {
  const regex = /n(event|profile|pub|addr)([^\s\W]*)/;
  const match = url.match(regex);

  if (match) {
    const extracted = match[0];
    return `nostr:${extracted}`;
  } else {
    return url;
  }
};

const getComponent = (children) => {
  if (!children) return <></>;
  let res = [];
  for (let i = 0; i < children.length; i++) {
    if (typeof children[i] === "string") {
      let all = children[i].toString().split(" ");
      for (let child of all) {
        let key = `${i}-${child}-${
          Date.now() / Math.floor(Math.random() * 100000)
        }`;
        let child_ = getNIP21FromURL(child.toString());
        if (child_.startsWith("nostr:")) {
          try {
            if (
              (child_.includes("nostr:") ||
                child_.includes("naddr") ||
                child_.includes("nprofile") ||
                child_.includes("npub") ||
                child_.includes("nevent")) &&
              child_.length > 30
            ) {
              const nip19add = child_
                .replace("nostr:", "")
                .replace("@", "")
                .replace(".", "")
                .replace(",", "");

              res.push(<Nip19Parsing addr={nip19add} key={key} />);
            }
          } catch (err) {
            res.push(
              <p dir="auto" key={key}>
                {child_.split("nostr:")[1]}
              </p>
            );
          }
        }
        if (!child_.startsWith("nostr:")) {
          res.push(
            <p dir="auto" key={key}>
              {child_}
            </p>
          );
        }
      }
    }
    if (typeof children[i] !== "string") {
      let key = `${i}-${Date.now()}`;
      if (children[i].type === "a" && isImageUrlSync(children[i].props?.href)) {
        res.push(
          <img
            className="sc-s-18"
            style={{ margin: "1rem auto" }}
            width={"100%"}
            src={children[i].props?.href}
            alt="el"
            loading="lazy"
            key={key}
          />
        );
      } else
        res.push(
          <p dir="auto" key={key}>
            {children[i]}
          </p>
        );
    }
  }
  return (
    <div
      className="fx-centered fx-start-h fx-wrap fit-container"
      style={{ columnGap: "3px", rowGap: "8px" }}
    >
      {mergeConsecutivePElements(res)}
    </div>
  );
};

function mergeConsecutivePElements(arr) {
  const result = [];
  let currentTextElement = null;
  let currentImages = [];
  let tempArray = [];

  for (let i = 0; i < arr.length; i++) {
    if (
      !(
        i - 1 > 0 &&
        i + 1 < arr.length &&
        arr[i].type === "br" &&
        typeof arr[i - 1].type !== "string" &&
        arr[i - 1].props?.src &&
        typeof arr[i + 1].type !== "string" &&
        arr[i + 1].props?.src
      )
    ) {
      tempArray.push(arr[i]);
    }
  }

  for (const element of tempArray) {
    if (["p", "span"].includes(element.type)) {
      if (!currentTextElement) {
        currentTextElement = { ...element };
        currentTextElement.props = {
          ...element.props,
          children: [element.props.children],
        };
      } else {
        let tempPrevChildren = currentTextElement.props.children;
        if (typeof element.props.children !== "string") {
          tempPrevChildren.push(element.props.children);
        }
        if (
          typeof tempPrevChildren[tempPrevChildren.length - 1] === "string" &&
          typeof element.props.children === "string"
        ) {
          tempPrevChildren[tempPrevChildren.length - 1] = `${
            tempPrevChildren[tempPrevChildren.length - 1]
          } ${element.props.children}`;
        }
        if (
          typeof tempPrevChildren[tempPrevChildren.length - 1] !== "string" &&
          typeof element.props.children === "string"
        ) {
          tempPrevChildren.push(` ${element.props.children}`);
        }
        currentTextElement = {
          ...currentTextElement,
          props: {
            ...currentTextElement.props,
            children: tempPrevChildren,
          },
        };
      }
    } else if (typeof element.type !== "string" && element.props?.src) {
      if (currentTextElement) {
        result.push(currentTextElement);
        currentTextElement = null;
      }
      currentImages.push(element);
    } else {
      if (currentTextElement) {
        result.push(currentTextElement);
        currentTextElement = null;
      }
      if (currentImages.length > 0) {
        result.push(createImageGrid(currentImages));
        currentImages = [];
      }
      result.push(element);
    }
  }

  if (currentTextElement) {
    result.push(currentTextElement);
  }
  if (currentImages.length > 0) {
    result.push(createImageGrid(currentImages));
  }

  return result;
}

function createImageGrid(images) {
  if (images.length === 1)
    return (
      <div className="image-grid" key={Math.random()}>
        {images.map((image, index) =>
          React.cloneElement(image, { key: index })
        )}
      </div>
    );
  let images_ = images.map((image) => image.props.src);
  return <Carousel imgs={images_} />;
}

const getAuthPubkeyFromNip05 = async (nip05Addr) => {
  try {
    let addressParts = nip05Addr.split("@");
    if (addressParts.length === 1) {
      addressParts.unshift("_");
    }
    const data = await axios.get(
      `https://${addressParts[1]}/.well-known/nostr.json?name=${addressParts[0]}`
    );
    return data.data.names[addressParts[0]];
  } catch (err) {
    console.error(err);
  }
};

const getAIFeedContent = (news) => {
  let tags = news.tags;
  let is_authentic = false;
  let key_to_dec = "";
  let l = "";
  let L = "";
  let published_at = "";
  let description = "";
  let image = "";
  let source_url = "";
  let source_domain = "";
  let source_name = "";
  let source_icon = "";

  for (let tag of tags) {
    if (tag[0] === "yaki_ai_feed") key_to_dec = tag[1];
    if (tag[0] === "l") l = tag[1];
    if (tag[0] === "L") L = tag[1];
    if (tag[0] === "published_at") published_at = tag[1];
    if (tag[0] === "description") description = tag[1];
    if (tag[0] === "image") image = tag[1];
    if (tag[0] === "source_url") source_url = tag[1];
    if (tag[0] === "source_domain") source_domain = tag[1];
    if (tag[0] === "source_name") source_name = tag[1];
    if (tag[0] === "source_icon") source_icon = tag[1];
  }
  try {
    is_authentic = key_to_dec
      ? decryptEventData(key_to_dec, `${news.created_at}`).status
      : false;
  } catch (err) {
    console.log(err);
  }

  return {
    id: news.id,
    pubkey: news.pubkey,
    title: news.content,
    created_at: published_at ? news.created_at : parseInt(published_at),
    kind: L,
    l,
    published_at,
    description,
    image: image || getImagePlaceholder(),
    source_url,
    source_domain,
    source_name,
    source_icon,
    is_authentic,
    nEvent: nip19.neventEncode({
      id: news.id,
      relays: relaysOnPlatform,
      author: news.pubkey,
    }),
  };
};

const getFlashnewsContent = async (news) => {
  let tags = news.tags;
  let keywords = [];
  let is_important = false;
  let is_authentic = false;
  let source = "";
  let key_to_dec = "";
  let l = "";

  for (let tag of tags) {
    if (tag[0] === "t") keywords.push(tag[1]);
    if (tag[0] === "l") l = tag[1];
    if (tag[0] === "important") is_important = true;
    if (tag[0] === "source") source = tag[1];
    if (tag[0] === "yaki_flash_news") key_to_dec = tag[1];
  }
  try {
    is_authentic = key_to_dec
      ? decryptEventData(key_to_dec, `${news.created_at}`).status
      : false;
  } catch (err) {
    console.log(err);
  }

  let content = await getNoteTree(news.content);
  return {
    id: news.id,
    content: content,
    raw_content: news.content,
    created_at: news.created_at,
    pubkey: news.pubkey,
    keywords,
    source,
    is_important,
    is_authentic,
    l,
    nEvent: nip19.neventEncode({
      id: news.id,
      relays: relaysOnPlatform,
      author: news.pubkey,
    }),
  };
};

const getVideoContent = (video) => {
  let tags = video.tags;
  let keywords = [];
  let published_at = video.created_at;
  let title = "";
  let url = "";
  let d = "";
  let image = "";
  let duration = 0;

  for (let tag of tags) {
    if (tag[0] === "t") keywords.push(tag[1]);
    if (tag[0] === "published_at" && tag[1]) published_at = parseInt(tag[1]);
    if (tag[0] === "duration" && tag[1]) duration = parseInt(tag[1]);
    if (tag[0] === "d") d = tag[1];
    if (tag[0] === "url") url = tag[1];
    if (tag[0] === "title") title = tag[1];
    if ((tag[0] === "thumb" || tag[0] === "image") && tag[1]) image = tag[1];
  }

  return {
    id: video.id,
    kind: video.kind,
    d,
    content: video.content,
    created_at: video.created_at,
    published_at,
    pubkey: video.pubkey,
    keywords,
    duration: formatMinutesToMMSS(duration),
    minutes: duration,
    url,
    title,
    image,
    naddr: nip19.naddrEncode({
      pubkey: video.pubkey,
      kind: video.kind,
      identifier: d,
    }),
  };
};

const getVideoFromURL = (url) => {
  const isURLVid = isVid(url);

  if (isURLVid) {
    if (isURLVid.isYT) {
      return (
        <iframe
          style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: "var(--border-r-18)",
          }}
          src={`https://www.youtube.com/embed/${isURLVid.videoId}`}
          title="justin timberlake feat. timbaland - cry me a river [ slowed + reverb ]"
          frameBorder="0"
          allowFullScreen
        ></iframe>
      );
    }
    if (!isURLVid.isYT)
      return (
        <iframe
          style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: "var(--border-r-18)",
          }}
          src={`https://player.vimeo.com/video/${isURLVid.videoId}`}
          title="justin timberlake feat. timbaland - cry me a river [ slowed + reverb ]"
          frameBorder="0"
          allowFullScreen
        ></iframe>
      );
  }
  if (!isURLVid) {
    return (
      <video
        controls={true}
        autoPlay={false}
        name="media"
        width={"100%"}
        className="sc-s-18"
        style={{ border: "none", aspectRatio: "16/9" }}
      >
        <source src={url} type="video/mp4" />
      </video>
    );
  }
};

const shuffleArray = (array) => {
  let tempArray = Array.from(array);
  for (let i = tempArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = tempArray[i];
    tempArray[i] = tempArray[j];
    tempArray[j] = temp;
  }
  return tempArray;
};

const formatMinutesToMMSS = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const remainingSecondsAfterHours = seconds % 3600;
  const minutes = Math.floor(remainingSecondsAfterHours / 60);
  const remainingSeconds = remainingSecondsAfterHours % 60;

  const paddedHours = hours.toString().padStart(2, "0");
  const paddedMinutes = minutes.toString().padStart(2, "0");
  const paddedSeconds = remainingSeconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${paddedMinutes}:${paddedSeconds}`;
  }
};

const levelCount = (nextLevel) => {
  if (nextLevel === 1) return 0;
  else return levelCount(nextLevel - 1) + (nextLevel - 1) * 50;
};

const getCurrentLevel = (points) => {
  return Math.floor((1 + Math.sqrt(1 + (8 * points) / 50)) / 2);
};

const validateWidgetValues = (value, kind, type) => {
  if (kind === "url" && (type === "regular" || !type)) {
    let regex =
      /((https?:www\.)|(https?:\/\/)|(www\.))[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9]{1,6}(\/[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)?/;
    return regex.test(value);
  }
  if (kind === "url" && type === "zap") {
    let regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return (
      regex.test(value) ||
      (value.startsWith("lnurl") && value.length > 32) ||
      (value.startsWith("lnbc") && value.length > 32)
    );
  }
  if (kind === "url" && type === "nostr") {
    let regex = /^(npub|note|nprofile|nevent|naddr)/;
    return regex.test(value);
  }
  if (kind === "url" && type === "youtube") {
    let regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=)|youtu\.be\/)([\w-]{11,})/;
    return regex.test(value);
  }
  if (kind === "url" && type === "telegram") {
    let regex = /(?:https?:\/\/)?(?:www\.)?(?:t\.me\/|telegram\.me\/)([\w-]+)/;
    return regex.test(value);
  }
  if (kind === "url" && type === "discord") {
    let regex =
      /(https?:\/\/)?(www\.)?(discord\.(gg|com)\/(invite\/)?([a-zA-Z0-9]{1,16})|discord\.com\/channels\/(@me|[0-9]{17,19})\/[0-9]{17,19})/g;
    return regex.test(value);
  }
  if (kind === "url" && type === "x") {
    let regex = /^(https?:\/\/)?(www\.)?(x\.com|twitter\.com)\/[a-zA-Z0-9_]+$/;
    return regex.test(value);
  }
  if (kind === "aspect_ratio") {
    return ["1:1", "16:9"].includes(value);
  }
  if (kind === "content") {
    return typeof value === "string";
  }
  if (kind.includes("color")) {
    let regex = /^#[0-9a-fA-F]{6}/;
    if (value === "") return true;
    return regex.test(value);
  }
  if (kind === "weight") {
    if (value === "") return true;
    return ["regular", "bold"].includes(value);
  }
  if (kind === "size") {
    return ["h1", "h2", "regular", "small"].includes(value);
  }
  if (kind === "pubkey") {
    return true;
  }
  if (kind === "type") {
    return [
      "regular",
      "zap",
      "nostr",
      "youtube",
      "telegram",
      "discord",
      "x",
    ].includes(value);
  }
  if (kind === "layout") {
    return [1, 2, "1", "2"].includes(value);
  }
  if (kind === "division") {
    return ["1:1", "1:2", "2:1"].includes(value);
  }
  if (kind === "poll-content") {
    try {
      let parsed = JSON.parse(value);
      let checkKeys = Object.keys(parsed).find(
        (key) =>
          !["created_at", "content", "pubkey", "sig", "id", "tags"].includes(
            key
          )
      );
      if (parsed.kind === 6969 && !checkKeys) return true;
      return false;
    } catch (err) {
      return false;
    }
  }
  return false;
};

const getWallets = () => {
  let nostkeys = getKeys();
  let wallets = localStorage.getItem("yaki-wallets");
  if (!(wallets && nostkeys)) return [];
  try {
    wallets = JSON.parse(wallets);
    let wallets_ = wallets.find((wallet) => wallet?.pubkey === nostkeys.pub);
    return wallets_ ? wallets_.wallets : [];
  } catch (err) {
    return [];
  }
};

const updateWallets = (wallets_) => {
  let nostkeys = getKeys();
  let wallets = localStorage.getItem("yaki-wallets");

  if (!nostkeys) return;
  try {
    wallets = wallets ? JSON.parse(wallets) : [];
    let wallets_index = wallets.findIndex(
      (wallet) => wallet?.pubkey === nostkeys.pub
    );
    if (wallets_index !== -1) {
      wallets[wallets_index].wallets = wallets_;
    }
    if (wallets_index === -1) {
      wallets.push({ pubkey: nostkeys.pub, wallets: wallets_ });
    }
    localStorage.setItem("yaki-wallets", JSON.stringify(wallets));
  } catch (err) {
    localStorage.removeItem("yaki-wallets");
    return [];
  }
};

let getKeys = () => {
  try {
    let keys = localStorage.getItem("_nostruserkeys");
    keys = JSON.parse(keys);
    return keys;
  } catch (err) {
    return false;
  }
};

const getConnectedAccounts = () => {
  try {
    let accounts = localStorage.getItem("yaki-accounts") || [];
    accounts = Array.isArray(accounts) ? [] : JSON.parse(accounts);
    return accounts;
  } catch (err) {
    console.log(err);
    return [];
  }
};

export {
  getNoteTree,
  getLinkFromAddr,
  getComponent,
  getAuthPubkeyFromNip05,
  getAIFeedContent,
  getFlashnewsContent,
  getVideoContent,
  getVideoFromURL,
  shuffleArray,
  formatMinutesToMMSS,
  LoginToAPI,
  levelCount,
  getCurrentLevel,
  validateWidgetValues,
  getWallets,
  updateWallets,
  getConnectedAccounts,
};
