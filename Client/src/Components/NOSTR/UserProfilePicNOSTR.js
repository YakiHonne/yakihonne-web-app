import { nip19 } from "nostr-tools";
import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { nostrPpPlaceholder } from "../../Content/NostrPPPlaceholder";
import relaysOnPlatform from "../../Content/Relays";
// import placeholder from "../../media/images/nostr-pp-ph.png";
import { Context } from "../../Context/Context";

export default function UserProfilePicNOSTR({
  user_id,
  size,
  ring = true,
  mainAccountUser = false,
  img,
  allowClick = true,
}) {
  const { nostrUser } = useContext(Context);
  const navigateTo = useNavigate();
  const handleClick = (e) => {
    e.stopPropagation();
    try {
      if (allowClick) {
        let url = nip19.nprofileEncode({
          pubkey: mainAccountUser ? nostrUser.pubkey : user_id,
          relays: relaysOnPlatform,
        });
        // if (mainAccountUser) navigateTo(`/users/${nostrUser.pubkey}`);
        // if (!mainAccountUser && user_id) navigateTo(`/users/${user_id}`);
        navigateTo(`/users/${url}`);
      }
      return null;
    } catch {
      return null;
    }
  };
  if (mainAccountUser)
    return (
      <div
        className={`pointer fx-centered ${
          ring ? "profile-pic-ring" : ""
        } bg-img cover-bg`}
        style={{
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          backgroundImage: nostrUser.img
            ? `url(${nostrUser.img})`
            : `url(${nostrPpPlaceholder[0]})`,
          borderRadius: "var(--border-r-50)",
          backgroundColor: "var(--dim-gray)",
          borderColor: "black",
        }}
        onClick={handleClick}
      ></div>
    );
  return (
    <div
      className={`pointer fx-centered ${
        ring ? "profile-pic-ring" : ""
      } bg-img cover-bg`}
      style={{
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        backgroundImage: img ? `url(${img})` : `url(${nostrPpPlaceholder[0]})`,
        borderRadius: "var(--border-r-50)",
        backgroundColor: "var(--dim-gray)",
        borderColor: "black",
      }}
      onClick={handleClick}
    ></div>
  );
}
