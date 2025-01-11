import React, { useContext, useEffect, useState } from "react";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import LoadingDots from "../LoadingDots";
import KindOne from "./KindOne";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import { finalizeEvent } from "nostr-tools";

export default function QuoteNote({ note, exit }) {
  const { nostrUser, nostrKeys, isPublishing, setToPublish, setToast } =
    useContext(Context);
  const [quote, setQuote] = useState("");
  const [isLoading, setIsLoading] = useState("");

  const quoteNote = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      if (!nostrKeys) {
        return false;
      }
      setIsLoading(true);
      let event = {
        kind: 1,
        content: `${quote} nostr:${note.nEvent}`,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["q", note.id],
          ["p", note.pubkey],
        ],
      };
      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
        } catch (err) {
          console.log(err);
          setIsLoading(false);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
      }

      setToPublish({
        eventInitEx: event,
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])]
          : relaysOnPlatform,
      });
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isPublishing && isLoading) {
      setIsLoading(false);
      exit();
    }
  }, [isPublishing]);

  return (
    <div className="fixed-container fx-centered box-pad-h">
      <div
        className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col"
        style={{ width: "min(100%, 500px)" }}
      >
        <div className="fx-scattered fit-container box-marg-s">
          <h4>Quote this note</h4>
          <div className="fx-centered">
            <button
              className="btn btn-gst-red btn-small"
              onClick={exit}
              disabled={isLoading}
            >
              {isLoading ? <LoadingDots /> : "Cancel"}
            </button>
            <button
              className="btn btn-normal btn-small"
              onClick={quoteNote}
              disabled={isLoading}
            >
              {isLoading ? <LoadingDots /> : "Post"}
            </button>
          </div>
        </div>
        <div className="fit-container fx-centered fx-start-v ">
          <UserProfilePicNOSTR
            size={48}
            mainAccountUser={true}
            allowClick={false}
            ring={false}
          />
          <div className="fit-container fx-centered fx-wrap">
            <div className="fit-container">
              <textarea
                className="txt-area ifs-full if "
                placeholder="What's in your mind"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        <div
          className="fit-container"
          style={{ maxHeight: "40vh", overflow: "scroll" }}
        >
          <KindOne event={note} reactions={false} />
        </div>
      </div>
    </div>
  );
}
