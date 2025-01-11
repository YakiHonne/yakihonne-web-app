import React, { useContext, useState } from "react";
import LoadingDots from "./LoadingDots";
import { uploadToS3 } from "../Helpers/NostrPublisher";
import { Context } from "../Context/Context";
import { finalizeEvent } from "nostr-tools";
import { encodeBase64URL } from "../Helpers/Encryptions";
import axios from "axios";

export default function UploadFile({
  kind = "image/*",
  round = false,
  small = false,
  setImageURL,
  setIsUploadsLoading,
  setFileMetadata,
}) {
  const { nostrKeys, setToast } = useContext(Context);
  const [method, setMethod] = useState("nostr.build");
  const [isLoading, setIsLoading] = useState(false);

  const Upload = async (e) => {
    let file = e.target.files[0];
    if (!file && (!nostrKeys.sec || !nostrKeys.ext)) {
      setToast({
        type: 2,
        desc: "It's either you selected a corrupted file or you're not logged-in using your secret key/extension",
      });
      return;
    }
    setFileMetadata(file);
    if (method === "yakihonne") {
      setIsLoading(true);
      setIsUploadsLoading(true);
      let imageURL = await uploadToS3(file, nostrKeys.pub);
      if (imageURL) setImageURL(imageURL);
      if (!imageURL) {
        setToast({
          type: 2,
          desc: "Error uploading file",
        });
      }
      setIsLoading(false);
      setIsUploadsLoading(false);
      return;
    }
    if (method === "nostr.build") {
      setIsLoading(true);
      setIsUploadsLoading(true);
      let event = {
        kind: 27235,
        content: "",
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["u", "https://nostr.build/api/v2/nip96/upload"],
          ["method", "POST"],
        ],
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          setIsLoading(false);
          setIsUploadsLoading(false);
          setToast({
            type: 2,
            desc: "Error uploading file",
          });
          console.log(err);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }
      let encodeB64 = encodeBase64URL(JSON.stringify(event));
      let fd = new FormData();
      fd.append("file", file);
      try {
        let imageURL = await axios.post(
          "https://nostr.build/api/v2/nip96/upload",
          fd,
          {
            headers: {
              "Content-Type": "multipart/formdata",
              Authorization: `Nostr ${encodeB64}`,
            },
          }
        );

        setImageURL(
          imageURL.data.nip94_event.tags.find((tag) => tag[0] === "url")[1]
        );
        setIsLoading(false);
        setIsUploadsLoading(false);
        return;
      } catch (err) {
        setIsLoading(false);
        setIsUploadsLoading(false);
        setToast({
          type: 2,
          desc: "Error uploading file",
        });
        return;
      }
    }
  };

  return (
    <label
      htmlFor="file-upload"
      className={round ? (small ? "round-icon-small" : "round-icon") : ""}
      style={{
        position: "relative",
        pointerEvents: isLoading ? "none" : "auto",
      }}
    >
      <input
        type="file"
        name="file-upload"
        id="file-upload"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          opacity: 0,
          zIndex: -1,
        }}
        accept={kind}
        onChange={Upload}
        disabled={isLoading}
      />
      {isLoading ? (
        small ? (
          <div style={{ scale: ".6" }}>
            {" "}
            <LoadingDots />
          </div>
        ) : (
          <LoadingDots />
        )
      ) : (
        <div className={small ? "upload-file" : "upload-file-24"}></div>
      )}
    </label>
  );
}
