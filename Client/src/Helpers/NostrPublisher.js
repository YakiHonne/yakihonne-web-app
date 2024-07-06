import relaysOnPlatform from "../Content/Relays";
import { getEventHash, signEvent, relayInit } from "nostr-tools";
import axiosInstance from "./HTTP_Client";

const publishPost = async (
  nostrKeys,
  kind = 0,
  content,
  tags = [],
  allRelays = relaysOnPlatform
) => {

  let event = {
    kind,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags,
  };
  if (nostrKeys.ext) {
    try {
      event = await window.nostr.signEvent(event);
    } catch {
      return false;
    }
  } else {
    event.pubkey = nostrKeys.pub;
    event.id = getEventHash(event);
    event.sig = signEvent(event, nostrKeys.sec);
  }
  let relaysTopublish = [];
  for (let url of allRelays) {
    try {
      let relay = relayInit(url);
      var res = { url: url.split("wss://")[1], status: false };
      await relay.connect();
      let pub = relay.publish(event);
      let status = new Promise((resolve) => {
        pub.on("ok", () => {
          resolve(true);
        });
        pub.on("failed", () => {
          resolve(false);
        });
      });
      await status.then((result) => {
        res.status = result;
      });
      relaysTopublish.push(res);
    } catch (err) {
      console.log(err);
      // return res;
      relaysTopublish.push(false);
    }
  }
  return relaysTopublish;
};
const getZapEventRequest = async (nostrKeys, content, tags = []) => {
  let event = {
    kind: 9734,
    content,
    created_at: Math.floor(Date.now() / 1000),
    tags,
  };
  if (nostrKeys.ext) {
    try {
      event = await window.nostr.signEvent(event);
    } catch {
      return false;
    }
  } else {
    event.pubkey = nostrKeys.pub;
    event.id = getEventHash(event);
    event.sig = signEvent(event, nostrKeys.sec);
  }

  return encodeURI(JSON.stringify(event));
};

const deletePost = async (nostrKeys, eventID, allRelays = relaysOnPlatform) => {
  let event = {
    kind: 5,
    content: "This post is to delete!",
    created_at: Math.floor(Date.now() / 1000),
    tags: [["e", eventID]],
  };
  if (nostrKeys.ext) {
    event = await window.nostr.signEvent(event);
  } else {
    event.pubkey = nostrKeys.pub;
    event.id = getEventHash(event);
    event.sig = signEvent(event, nostrKeys.sec);
  }
  // let relaysTopublish = await Promise.all(
  //   allRelays.map(async (url) => {
  //     try {
  //       let relay = relayInit(url);
  //       var res = { url: url.split("wss://")[1], status: false };
  //       relay.on("connect", () => {
  //         let pub = relay.publish(event);
  //         pub.on("ok", () => {
  //           res.status = true;
  //         });
  //         pub.on("failed", () => {});
  //       });
  //       await relay.connect();
  //       return res;
  //     } catch (err) {
  //       console.log(err);
  //       return res;
  //     }
  //   })
  // );
  let relaysTopublish = [];
  for (let url of allRelays) {
    try {
      let relay = relayInit(url);
      var res = { url: url.split("wss://")[1], status: false };
      await relay.connect();
      let pub = relay.publish(event);
      let status = new Promise((resolve) => {
        pub.on("ok", () => {
          resolve(true);
        });
        pub.on("failed", () => {
          resolve(false);
        });
      });
      await status.then((result) => {
        res.status = result;
      });
      relaysTopublish.push(res);
    } catch (err) {
      console.log(err);
      // return res;
      relaysTopublish.push(res);
    }
  }
  return relaysTopublish;
};

const uploadToS3 = async (img, pubkey) => {
  if (img) {
    try {
      let fd = new FormData();
      fd.append("file", img);
      fd.append("pubkey", pubkey);
      let data = await axiosInstance.post("/api/v1/file-upload", fd, {
        headers: { "Content-Type": "multipart/formdata" },
      });
      return data.data.image_path;
    } catch {
      return false;
    }
  }
};

const deleteFromS3 = async (img) => {
  if (img.includes("daorayaki-fs-bucket")) {
    let data = await axiosInstance.delete("/api/v1/file-upload", {
      params: { image_path: img },
    });
    return true;
  }
  return false;
};

export {
  publishPost,
  deletePost,
  uploadToS3,
  deleteFromS3,
  getZapEventRequest,
};
