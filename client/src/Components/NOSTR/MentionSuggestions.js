import axios from "axios";
import { nip19 } from "nostr-tools";
import React, { useContext, useEffect, useState } from "react";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import { Link } from "react-router-dom";

export default function MentionSuggestions({ mention, setSelectedMention }) {
  const { nostrAuthors, setNostrAuthors } = useContext(Context);
  const [users, setUsers] = useState(nostrAuthors);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const filteredUsers = mention
      ? nostrAuthors.filter((user) => {
          if (
            user.display_name?.toLowerCase().includes(mention.toLowerCase()) ||
            user.name?.toLowerCase().includes(mention.toLowerCase()) ||
            user.lud06?.toLowerCase().includes(mention.toLowerCase()) ||
            user.nip05?.toLowerCase().includes(mention.toLowerCase())
          )
            return user;
        })
      : Array.from(nostrAuthors);
    setUsers(filteredUsers);
    const getUsersFromCache = async () => {
      try {
        setIsLoading(true);
        const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

        let data = await axios.get(
          `${API_BASE_URL}/api/v1/users/search/${mention}`
        );
        setNostrAuthors((prev) => {
          return [...prev, ...data.data].filter((item, index) => {
            if (
              [...prev, ...data.data].findIndex(
                (item_) => item_.pubkey === item.pubkey
              ) === index
            )
              return item;
          });
        });
        setUsers((prev) => {
          let tempData = [...prev, ...data.data];
          return tempData.filter((user, index, tempData) => {
            if (
              tempData.findIndex((user_) => user_.pubkey === user.pubkey) ===
              index
            )
              return user;
          });
        });
        setIsLoading(false);
      } catch (err) {
        console.log(err);
        setIsLoading(false);
      }
    };
    var timer = setTimeout(null);
    if (mention) {
      timer = setTimeout(async () => {
        getUsersFromCache();
      }, 400);
    } else {
      clearTimeout(timer);
    }
    return () => {
      clearTimeout(timer);
    };
  }, [mention]);

  if (users === false) return;

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        width: "100%",
        maxHeight: "200px",
        overflow: "scroll",
        zIndex: 100,
        gap: 0,
      }}
      className="sc-s-18 fx-centered fx-start-v fx-start-h fx-col  box-pad-v-s"
    >
      {isLoading && (
        <>
          <div className="fx-centered fit-container box-pad-v-s">
            <p className="p-small gray-c">Loading more</p>
            <LoadingDots />
          </div>
          <hr />
        </>
      )}
      {users.map((user, index) => {
        let url = nip19.npubEncode(user.pubkey);
        return (
          <div
            key={user.pubkey}
            className="fx-scattered box-pad-v-s box-pad-h-m fit-container pointer search-bar-post"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMention(url);
            }}
            style={{
              borderTop: index !== 0 ? "1px solid var(--pale-gray)" : "",
            }}
          >
            <div className="fx-centered">
              <UserProfilePicNOSTR
                img={user.picture || ""}
                size={36}
                user_id={user.pubkey}
                ring={false}
              />
              <div className="fx-centered fx-start-h">
                <div
                  className="fx-centered fx-col fx-start-v "
                  style={{ rowGap: 0 }}
                >
                  <p className="p-one-line">{user.display_name || user.name}</p>
                  <p className="orange-c p-medium p-one-line">
                    @{user.name || user.display_name}
                  </p>
                </div>
              </div>
            </div>
            <Link
              to={`/${url}`}
              onClick={(e) => {
                e.stopPropagation();
              }}
              target="_blank"
            >
              <div className="share-icon"></div>
            </Link>
          </div>
        );
      })}
      {users.length === 0 && !isLoading && (
        <div className="fit-container fx-centered">
          <p className="gray-c p-medium p-italic">No suggestions</p>
        </div>
      )}
    </div>
  );
}
