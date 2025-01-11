import React, { useContext, useEffect, useState } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import { Context } from "../../Context/Context";
import {
  filterRelays,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { Link } from "react-router-dom";
const pool = new SimplePool();
export default function NProfilePreviewer({
  pubkey,
  margin = true,
  close = false,
  showSharing = true,
  onClose,
  setMetataData = () => null,
}) {
  const { nostrUser } = useContext(Context);
  const [author, setAuthor] = useState(getEmptyNostrUser(pubkey));

  useEffect(() => {
    let relaysToUse = filterRelays(nostrUser?.relays || [], relaysOnPlatform);
    let last_created_at = 0;
    const sub = pool.subscribeMany(
      relaysToUse,
      [{ kinds: [0], authors: [pubkey] }],
      {
        onevent(event) {
          if (event.created_at > last_created_at) {
            last_created_at = event.created_at;
            let content = JSON.parse(event.content);
            setMetataData(content);
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
        },
        oneose() {
          sub.close();
          pool.close(relaysToUse);
        },
      }
    );
  }, []);

  return (
    <div
      className={`fit-container sc-s-18 fx-scattered  box-pad-h-m box-pad-v-m ${
        margin ? "box-marg-s" : ""
      }`}
    >
      <div className="fx-centered" style={{ columnGap: "12px" }}>
        <UserProfilePicNOSTR
          ring={false}
          img={author.picture}
          size={40}
          user_id={pubkey}
        />
        <div>
          <p style={{ margin: 0 }}>{author.display_name}</p>
          <p style={{ margin: 0 }} className="p-medium gray-c">
            @{author.name}
          </p>
        </div>
      </div>
      {!close && showSharing && (
        <Link to={`/users/${nip19.nprofileEncode({ pubkey })}`} target="_blank">
          <div className="share-icon-24"></div>
        </Link>
      )}
      {close && (
        <div className="close" style={{ position: "static" }} onClick={onClose}>
          <div></div>
        </div>
      )}
    </div>
  );
}
