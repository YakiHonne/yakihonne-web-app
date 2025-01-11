import React, { useContext, useEffect, useState } from "react";
import { SimplePool, nip19 } from "nostr-tools";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { Link } from "react-router-dom";

const pool = new SimplePool();

export default function NAddrPreviewer({ pubkey, d, kind, relays = [] }) {
  const { nostrUser } = useContext(Context);
  const [event, setEvent] = useState({ title: "Untitled", naddr: "/" });
  useEffect(() => {
    let relaysToUse = filterRelays(nostrUser?.relays || [], [
      ...relaysOnPlatform,
      ...relays,
    ]);
    const sub = pool.subscribeMany(
      relaysToUse,
      [{ kinds: [kind], authors: [pubkey], "#d": [d] }],
      {
        onevent(event) {
          let naddr = nip19.naddrEncode({
            identifier: d,
            pubkey,
            kind,
          });
          if ([30004, 30023].includes(kind)) {
            let title = event.tags.find((tag) => tag[0] === "title");
            title = title ? title[1] : "Untitled";
            setEvent({
              title,
              naddr:
                kind === 30023
                  ? `/article/${naddr}`
                  : kind === 30004
                  ? `/curations/${naddr}`
                  : window.location.pathname,
            });
          }
          if (kind === 31990) {
            setEvent({
              ...JSON.parse(event.content),
              keywords:
                event.tags
                  .filter((tag) => tag[0] === "t" && tag[1])
                  .map((tag) => tag[1]) || [],
            });
          }
        },
        oneose() {
          pool.close(relaysToUse);
        },
      }
    );
  }, []);

  if (![30004, 30023, 31990].includes(kind))
    return (
      <p>
        {nip19.naddrEncode({
          identifier: d,
          pubkey,
          kind,
        })}
      </p>
    );
  if (kind === 31990)
    return (
      <div className="fit-container sc-s-18 fx-scattered  box-pad-h-m box-pad-v-m box-marg-s">
        <div className="fx-centered fx-col fx-start-v">
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <UserProfilePicNOSTR
              img={event.picture || ""}
              size={48}
              mainAccountUser={false}
              ring={false}
              user_id={event.display_name || event.name || ""}
              allowClick={false}
            />
            <div>
              <p className="gray-c p-medium" style={{ margin: 0 }}>
                Platform
              </p>
              <p style={{ margin: 0 }}>
                {event.display_name || event.name || "Unnamed platform"}
              </p>
            </div>
          </div>
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <div style={{ width: "48px" }}></div>
            <div>
              <p className="gray-c p-medium" style={{ margin: 0 }}>
                About
              </p>
              <p style={{ margin: 0 }}>{event.about || "N/A"}</p>
            </div>
          </div>
          <div className="fx-centered" style={{ columnGap: "16px" }}>
            <div style={{ width: "48px" }}></div>
            <div>
              <p className="gray-c p-medium" style={{ margin: "0 0 .25rem 0" }}>
                Domain
              </p>
              {event.keywords?.length === 0 && "N/A"}
              {event.keywords?.map((keyword, index) => {
                return (
                  <div
                    key={`${keyword}-${index}`}
                    className="sticker sticker-small sticker-c1"
                  >
                    {keyword}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  return (
    <div className="fit-container sc-s-18 fx-scattered  box-pad-h-m box-pad-v-m box-marg-s">
      <div className="fx-centered fx-col fx-start-v">
        <p style={{ margin: 0 }} className="gray-c p-medium">
          {kind === 30023 && "Article"}
          {kind === 30004 && "Curation"}
          {kind !== 30004 && kind !== 30023 && "Unrecognized kind"}
        </p>
        <h4 style={{ margin: 0 }}>{event.title}</h4>
      </div>
      <Link to={event.naddr} target="_blank">
        <div className="share-icon-24"></div>
      </Link>
    </div>
  );
}
