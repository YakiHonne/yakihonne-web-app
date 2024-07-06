import React, { useContext, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { deletePost } from "../../Helpers/NostrPublisher";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import axiosInstance from "../../Helpers/HTTP_Client";
import { SimplePool } from "nostr-tools";

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
  const { setToast, nostrKeys, nostrUser } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteDraft = async () => {
    try {
      setIsLoading(true);
      let data = await deletePost(nostrKeys, post_id, [relayToDeleteFrom]);
      initDeleteFromS3(thumbnail);
      setToast({
        type: 1,
        desc: curation ? "Curation was deleted!" : "Article was deleted!",
      });
      setIsLoading(false);
      exitAndRefresh();
    } catch (err) {
      setIsLoading(false);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while deleting this article.",
      });
    }
  };

  const initDeleteFromS3 = async (img) => {
    const post = await pool.get(nostrUser.relays, { ids: [post_id] });
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
        <h3 className="p-centered">Delete "{title || "Untitled article"}"?</h3>
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
