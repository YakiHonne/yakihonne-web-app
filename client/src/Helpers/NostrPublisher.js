import { finalizeEvent } from "nostr-tools";
import axiosInstance from "./HTTP_Client";

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
    event = finalizeEvent(event, nostrKeys.sec);
  }
  return encodeURI(JSON.stringify(event));
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

export { uploadToS3, deleteFromS3, getZapEventRequest };
