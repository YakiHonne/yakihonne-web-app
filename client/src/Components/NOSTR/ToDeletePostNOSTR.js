import React, { useContext, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import axiosInstance from "../../Helpers/HTTP_Client";
import { SimplePool } from "nostr-tools";
import { filterRelays } from "../../Helpers/Encryptions";

const pool = new SimplePool();

export default function ToDeletePostNOSTR({
  exit,
  exitAndRefresh,
  post_id,
  title,
  thumbnail = "",
  curation = false,
  relayToDeleteFrom,
}) {
  const { setToast, nostrKeys, nostrUser, setToPublish } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteDraft = async () => {
    try {
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 5,
        content: "This event will be deleted!",
        tags: [["e", post_id]],
        allRelays: [...relayToDeleteFrom],
      });
      if (relayToDeleteFrom.length > 1) initDeleteFromS3(thumbnail);
      setIsLoading(false);
      exitAndRefresh();
    } catch (err) {
      setIsLoading(false);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while deleting this event.",
      });
    }
  };

  const initDeleteFromS3 = async (img) => {
    if (curation) {
      deleteFromS3(img);
      return;
    }
    const post = await pool.get(
      filterRelays(nostrUser?.relays || [], relaysOnPlatform),
      { ids: [post_id] }
    );
    if (!post) {
      deleteFromS3(img);
    }
  };

  const deleteFromS3 = async (img) => {
    if (img.includes("yakihonne.s3")) {
      let data = await axiosInstance.delete("/api/v1/file-upload", {
        params: { image_path: img },
      });
      return true;
    }
    return false;
  };

  return (
    <section className="fixed-container fx-centered box-pad-h">
      <section
        className="fx-centered fx-col sc-s box-pad-h box-pad-v"
        style={{ width: "450px" }}
      >
        <div
          className="fx-centered box-marg-s"
          style={{
            minWidth: "54px",
            minHeight: "54px",
            borderRadius: "var(--border-r-50)",
            backgroundColor: "var(--red-main)",
          }}
        >
          <div className="warning"></div>
        </div>
        {title && (
          <h3 className="p-centered" style={{wordBreak: "break-word"}}>
            Delete "{title.substring(0, 20)}
            {title.length > 20 && "..."}"?
          </h3>
        )}
        {!title && (
          <h3 className="p-centered" style={{wordBreak: "break-word"}}>
            Delete event?
          </h3>
        )}
        <p className="p-centered gray-c box-pad-v-m">
          {curation
            ? "You're about to delete this curation, do you wish to proceed?"
            : "You're about to delete this article, do you wish to proceed?"}
        </p>
        <div className="fx-centered fit-container">
          <button
            className="fx btn btn-gst-red"
            onClick={handleDeleteDraft}
            disabled={isLoading}
          >
            {isLoading ? (
              <LoadingDots />
            ) : curation ? (
              "delete curation"
            ) : (
              "delete article"
            )}
          </button>
          <button
            className="fx btn btn-red"
            onClick={exit}
            disabled={isLoading}
          >
            {isLoading ? <LoadingDots /> : "cancel"}
          </button>
        </div>
      </section>
    </section>
  );
}
