import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import {
  SimplePool,
  nip04,
  nip44,
  getEventHash,
  generateSecretKey,
  finalizeEvent,
} from "nostr-tools";
import { bytesTohex, filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import LoadingDots from "../LoadingDots";
import NProfilePreviewer from "./NProfilePreviewer";
import UserSearchBar from "../UserSearchBar";
import axiosInstance from "../../Helpers/HTTP_Client";


export default function InitiConvo({ exit, receiver = false }) {
  const {
    nostrKeys,
    nostrUser,
    setToPublish,
    toPublish,
    setToast,
    isPublishing,
    setUpdatedActionFromYakiChest,
    updateYakiChestStats,
  } = useContext(Context);
  const [selectedPerson, setSelectedPerson] = useState(receiver || "");
  const [message, setMessage] = useState("");
  const [legacy, setLegacy] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isPublishing && toPublish) exit();
  }, [isPublishing]);

  const handleSendMessage = async () => {
    if (
      !message ||
      !nostrKeys ||
      !selectedPerson ||
      (nostrKeys && !(nostrKeys.ext || nostrKeys.sec))
    )
      return;

    let relaysToPublish = nostrUser
      ? filterRelays(relaysOnPlatform, nostrUser?.relays || [])
      : relaysOnPlatform;
    if (legacy) {
      setIsLoading(true);
      let encryptedMessage = "";
      if (nostrKeys.ext) {
        encryptedMessage = await window.nostr.nip04.encrypt(
          selectedPerson,
          message
        );
      } else {
        encryptedMessage = await nip04.encrypt(
          nostrKeys.sec,
          selectedPerson,
          message
        );
      }
      let tags = [];
      tags.push(["p", selectedPerson]);

      let created_at = Math.floor(Date.now() / 1000);
      let tempEvent = {
        created_at,
        kind: 4,
        content: encryptedMessage,
        tags,
      };
      if (nostrKeys.ext) {
        try {
          tempEvent = await window.nostr.signEvent(tempEvent);
        } catch (err) {
          console.log(err);
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
    }
    if (!legacy) {
      let { sender_event, receiver_event } = await getGiftWrap();
      setIsLoading(true);
      let response = await initPublishing(
        relaysToPublish,
        sender_event,
        receiver_event
      );

      if (response) {
        let action_key =
          selectedPerson ===
          "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3"
            ? "dms-10"
            : "dms-5";
        updateYakiChest(action_key);
      } else {
        setIsLoading(false);
      }
    }
  };

  const updateYakiChest = async (action_key) => {
    try {
      let data = await axiosInstance.post("/api/v1/yaki-chest", {
        action_key,
      });
      let { user_stats, is_updated } = data.data;

      if (is_updated) {
        setUpdatedActionFromYakiChest(is_updated);
        updateYakiChestStats(user_stats);
      }
      exit();
    } catch (err) {
      console.log(err);
      exit();
    }
  };

  const getGiftWrap = async () => {
    let g_sk_1 = bytesTohex(generateSecretKey());
    let g_sk_2 = bytesTohex(generateSecretKey());

    let [signedKind13_1, signedKind13_2] = await Promise.all([
      getEventKind13(selectedPerson),
      getEventKind13(nostrKeys.pub),
    ]);

    let content_1 = nip44.v2.encrypt(
      JSON.stringify(signedKind13_1),
      nip44.v2.utils.getConversationKey(g_sk_1, selectedPerson)
    );
    let content_2 = nip44.v2.encrypt(
      JSON.stringify(signedKind13_2),
      nip44.v2.utils.getConversationKey(g_sk_2, nostrKeys.pub)
    );
    let event_1 = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 1059,
      tags: [["p", selectedPerson]],
      content: content_1,
    };
    let event_2 = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 1059,
      tags: [["p", nostrKeys.pub]],
      content: content_2,
    };
    event_1 = finalizeEvent(event_1, g_sk_1);
    event_2 = finalizeEvent(event_2, g_sk_2);
    return { sender_event: event_2, receiver_event: event_1 };
  };

  const getEventKind14 = () => {
    let event = {
      pubkey: nostrKeys.pub,
      created_at: Math.floor(Date.now() / 1000),
      kind: 14,
      tags: [
        ["p", selectedPerson],
        ["p", nostrKeys.pub],
      ],
      content: message,
    };

    event.id = getEventHash(event);
    return event;
  };

  const getEventKind13 = async (pubkey) => {
    let unsignedKind14 = getEventKind14();
    let content = nostrKeys.sec
      ? nip44.default.v2.encrypt(
          JSON.stringify(unsignedKind14),
          nip44.v2.utils.getConversationKey(nostrKeys.sec, pubkey)
        )
      : await window.nostr.nip44.encrypt(
          pubkey,
          JSON.stringify(unsignedKind14)
        );
    let event = {
      created_at: Math.floor(Date.now() / 1000) - 432000,
      kind: 13,
      tags: [],
      content,
    };
    event = nostrKeys.sec
      ? finalizeEvent(event, nostrKeys.sec)
      : await window.nostr.signEvent(event);
    return event;
  };

  const initPublishing = async (relays, event1, event2) => {
    try {
      let pool_ev1 = new SimplePool();
      let pool_ev2 = new SimplePool();
      let [res1, res2] = await Promise.race([
        Promise.allSettled(pool_ev1.publish(relaysOnPlatform, event1)),
        Promise.allSettled(pool_ev2.publish(relaysOnPlatform, event2)),
      ]);

      if (res1.status === "rejected") {
        setToast({
          type: 2,
          desc: "Error sending the message.",
        });
        return false;
      }

      setToast({
        type: 1,
        desc: "Message sent!",
      });

      return true;
    } catch (err) {
      console.log(err);
      setToast({
        type: 2,
        desc: "Error sending the message.",
      });
      return false;
    }
  };

  return (
    <div className="fixed-container fx-centered box-pad-h">
      <div
        className="box-pad-h box-pad-v sc-s-18"
        style={{
          position: "relative",
          width: "min(100%, 500px)",
          borderColor: !legacy ? "var(--green-main)" : "",
          transition: ".2s ease-in-out",
        }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <h4 className="box-marg-s">Start a conversation</h4>
        <div
          className="fx-centered fx-col fit-container"
          style={{ pointerEvents: isLoading ? "none" : "auto" }}
        >
          {!selectedPerson && <UserSearchBar onClick={setSelectedPerson} />}
          {selectedPerson && (
            <NProfilePreviewer
              pubkey={selectedPerson}
              margin={false}
              close={receiver ? false : true}
              showSharing={false}
              onClose={() => setSelectedPerson("")}
            />
          )}
          <textarea
            className="txt-area ifs-full"
            placeholder="What do you want to say?"
            style={{ height: "200px" }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
          ></textarea>

          <div className="fit-container fx-scattered">
            <button
              className="btn btn-normal"
              onClick={handleSendMessage}
              disabled={isLoading}
            >
              {isLoading ? <LoadingDots /> : "Send message"}
            </button>
            {(nostrKeys.sec || window?.nostr?.nip44) && (
              <div
                className="fx-centered round-icon-tooltip"
                data-tooltip={
                  legacy ? "Switch NIP-44 on" : "Switch back to legacy"
                }
              >
                {!legacy && (
                  <p className="p-medium green-c slide-left">NIP-44 ON</p>
                )}
                {legacy && (
                  <p className="p-medium gray-c slide-right">NIP-04</p>
                )}
                <div
                  className={`toggle ${legacy ? "toggle-dim-gray" : ""} ${
                    !legacy ? "toggle-green" : "toggle-dim-gray"
                  }`}
                  onClick={() => setLegacy(!legacy)}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
