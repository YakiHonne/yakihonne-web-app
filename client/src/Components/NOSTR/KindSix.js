import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import KindOne from "./KindOne";

export default function KindSix({ event }) {
  const { nostrAuthors, getNostrAuthor } = useContext(Context);
  const [user, setUser] = useState(getEmptyNostrUser(event.pubkey));
  useEffect(() => {
    let auth = getNostrAuthor(event.pubkey);
    if (auth) {
      setUser(auth);
    }
  }, [nostrAuthors]);

  return (
    <div
      className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v fit-container"
      style={{
        backgroundColor: "var(--c1-side)",
        rowGap: "10px",
        overflow: "visible",
      }}
    >
      <div
        className="fx-centered fx-start-h sc-s-18 box-pad-h-s box-pad-v-s round-icon-tooltip pointer"
        style={{ overflow: "visible" }}
        data-tooltip={`${user.display_name} reposted this on ${new Date(
          event.created_at * 1000
        ).toLocaleDateString()}, ${new Date(
            event.created_at * 1000
          ).toLocaleTimeString()}`}
      >
        <UserProfilePicNOSTR
          size={20}
          mainAccountUser={false}
          ring={false}
          user_id={user.pubkey}
          img={user.picture}
        />
        <div>
          <p className="p-medium">{user.display_name || user.name}</p>
        </div>
        <div className="switch-arrows"></div>
      </div>
      <KindOne event={event.relatedEvent} />
    </div>
  );
}
