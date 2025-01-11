import { finalizeEvent } from "nostr-tools";
import React, { useContext, useState } from "react";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import LoadingDots from "../LoadingDots";

export default function ToDeleteGeneral({
  title,
  kind = "event",
  eventId,
  refresh,
  cancel,
}) {
  const { nostrUser, nostrKeys, setToast, setToPublish } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const deleteEvent = async () => {
    try {
        setIsLoading(true)
      const created_at = Math.floor(new Date().getTime() / 1000);
      let relaysToPublish = nostrUser
        ? filterRelays(relaysOnPlatform, nostrUser?.relays || [])
        : relaysOnPlatform;
        
      let tempEvent = {
        created_at,
        kind: 5,
        content: "This event will be deleted!",
        tags: [["e", eventId]],
      };
      if (nostrKeys.ext) {
        try {
          tempEvent = await window.nostr.signEvent(tempEvent);
        } catch (err) {
          console.log(err);
          setToast({ type: 2, desc: "An error occurred while deleting the event"})
          setIsLoading(false);
          return false;
        }
      } else {
        tempEvent = finalizeEvent(tempEvent, nostrKeys.sec);
      }
      setToPublish({
        eventInitEx: tempEvent,
        allRelays: relaysToPublish,
      });
      setToast({ type: 1, desc: `${kind} deleted successfully` });
      refresh();
    } catch (err) {
        console.log(err);
        setToast({ type: 2, desc: "An error occurred while deleting the event"})
      setIsLoading(false);
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
          You're about to delete this {kind}, do you wish to proceed?
        </p>
        <div className="fx-centered fit-container">
          <button
            className="fx btn btn-gst-red"
            onClick={deleteEvent}
            disabled={isLoading}
          >
            {isLoading ? <LoadingDots /> : "Delete"}
          </button>
          <button className="fx btn btn-red" onClick={cancel}>
            {isLoading ? <LoadingDots /> : "Cancel"}
          </button>
        </div>
      </section>
    </section>
  );
}
