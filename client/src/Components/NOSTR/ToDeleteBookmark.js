import React, { useContext, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import { filterRelays } from "../../Helpers/Encryptions";

export default function ToDeleteBookmark({
  exit,
  exitAndRefresh,
  post_id,
  title,
}) {
  const { setToast, nostrKeys, nostrUser, setToPublish } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const handleDelete = () => {
    try {
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 5,
        content: "This event will be deleted!",
        tags: [["e", post_id]],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
          : relaysOnPlatform,
      });
      setIsLoading(false);
      exitAndRefresh();
    } catch (err) {
      setIsLoading(false);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while deleting this bookmark.",
      });
    }
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
        <h3 className="p-centered">Delete "{title || "Untitled bookmark"}"?</h3>
        <p className="p-centered gray-c box-pad-v-m">
          You're about to delete this bookmark, do you wish to proceed?
        </p>
        <div className="fx-centered fit-container">
          <button
            className="fx btn btn-gst-red"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? <LoadingDots /> : <>Delete bookmark</>}
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
