import React, { useContext, useEffect, useState } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import { Context } from "../../Context/Context";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import { getNoteTree } from "../../Helpers/Helpers";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { Link } from "react-router-dom";
import LoadingDots from "../LoadingDots";
const pool = new SimplePool();

export default function NEventPreviewer({ id, pubkey, extraRelays = [] }) {
  const { nostrUser } = useContext(Context);
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState(pubkey ? getEmptyNostrUser(pubkey) : "");

  useEffect(() => {
    let relaysToUse = filterRelays(
      nostrUser?.relays || [],
      filterRelays(extraRelays, relaysOnPlatform)
    );

    const sub = pool.subscribeMany(
      relaysToUse,
      [
        { kinds: [1], ids: [id] },
        { kinds: [0], authors: [pubkey] },
      ],
      {
        async onevent(event) {
          if (event.kind === 0) {
            let content = JSON.parse(event.content);
            setAuthor({
              picture: content.picture || "",
              name:
                content.name ||
                getBech32("npub", event.pubkey).substring(0, 10),
              display_name:
                content.display_name ||
                getBech32("npub", event.pubkey).substring(0, 10),
            });
          }
          if (event.kind === 1) {
            if (!author) setAuthor(getEmptyNostrUser(event.pubkey));
            let content = await getNoteTree(event.content);

            setNote(content);
          }
        },
        oneose() {
          sub.close();
          pool.close(relaysToUse);
        },
      }
    );
  }, []);

  return (
    <div className="fit-container sc-s-18 fx-centered fx-start-v fx-col box-pad-h-m box-pad-v-m box-marg-s">
      <div className="fit-container fx-scattered">
        <div className="fx-centered" style={{ columnGap: "12px" }}>
          <UserProfilePicNOSTR
            ring={false}
            img={author?.picture}
            size={40}
            user_id={pubkey}
          />
          <div>
            <p style={{ margin: 0 }}>{author?.display_name || "N/A"}</p>
            <p style={{ margin: 0 }} className="p-medium gray-c">
              @{author?.name || "N/A"}
            </p>
          </div>
        </div>
        <Link
          to={`/flash-news/${nip19.neventEncode({ author: pubkey, id })}`}
          target="_blank"
        >
          <div className="share-icon-24"></div>
        </Link>
      </div>
      <div
        className="fit-container box-pad-v-m fx-centered fx-start-h fx-wrap"
        style={{ rowGap: 0 }}
      >
        {note}
      </div>
      {!note && (
        <div
          className="fit-container box-pad-v-m fx-centered"
          style={{ rowGap: 0 }}
        >
          <p className="gray-c" style={{ margin: 0 }}>
            Loading
          </p>
          <LoadingDots />
        </div>
      )}
    </div>
  );
}
