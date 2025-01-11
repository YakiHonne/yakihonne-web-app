import { SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useMemo, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { filterRelays, getParsedAuthor } from "../../Helpers/Encryptions";
import LoadingScreen from "../LoadingScreen";
import Follow from "./Follow";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import ShortenKey from "./ShortenKey";
import NumberShrink from "../NumberShrink";
import { Context } from "../../Context/Context";

const pool = new SimplePool();

const getBulkListStats = (list) => {
  let toFollow = list.filter((item) => item.to_follow).length;
  let toUnfollow = list.length - toFollow;
  return { toFollow, toUnfollow };
};

export default function ShowUsersList({ exit, list, title, extras }) {
  const {
    userFollowings,
    nostrUser,
    setNostrUser,
    nostrKeys,
    setToPublish,
    isPublishing,
    setToast,
  } = useContext(Context);
  const [people, setPeople] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [bulkList, setBulkList] = useState([]);
  const bulkListStats = useMemo(() => {
    return getBulkListStats(bulkList);
  }, [bulkList]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sub = pool.subscribeMany(
          relaysOnPlatform,
          [{ kinds: [0], authors: list }],
          {
            onevent(event) {
              setPeople((data) => {
                let newF = [...data, getParsedAuthor(event)];
                let netF = newF.filter((item, index, newF) => {
                  if (
                    newF.findIndex((_item) => item.pubkey === _item.pubkey) ===
                    index
                  )
                    return item;
                });
                return netF;
              });
              setIsLoaded(true);
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  const getZaps = (pubkey) => {
    let sats = extras.reduce(
      (total, item) =>
        item.pubkey === pubkey ? (total += item.amount) : (total = total),
      0
    );
    return sats;
  };

  const followUnfollow = async () => {
    try {
      if (isPublishing) {
        setToast({
          type: 3,
          desc: "An event publishing is in process!",
        });
        return;
      }
      const toUnfollowList = bulkList
        .filter((item) => !item.to_follow)
        .map((item) => item.pubkey);

      let tempTags = Array.from(
        userFollowings?.filter((item) => !toUnfollowList.includes(item)) || []
      );
      for (let item of bulkList) {
        if (item.to_follow)
          tempTags.push([
            "p",
            item.pubkey,
            relaysOnPlatform[0],
            item.name || "yakihonne-user",
          ]);
      }

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 3,
        content: "",
        tags: tempTags,
        allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
      });

      let tempUser = {
        ...nostrUser,
      };
      tempUser.following = tempTags;
      setNostrUser({ ...tempUser });
      exit();
    } catch (err) {
      console.log(err);
    }
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <>
      <ArrowUp />
      <div
        className="fixed-container box-pad-h box-pad-v fx-centered fx-start-v "
        style={{
          padding: "2rem",
          overflow: "scroll",
          scrollBehavior: "smooth",
        }}
        onClick={(e) => {
          e.stopPropagation();
          exit();
        }}
      >
        <div style={{ width: "min(100%, 500px)", position: "relative" }}>
          <div className="close" onClick={exit}>
            <div></div>
          </div>
          <div className="fit-container fx-centered">
            <h3 className="p-caps">{title}</h3>
          </div>
          <div
            className="fit-container fx-centered fx-start-v fx-col box-marg-full"
            style={{ rowGap: "24px" }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {people.map((item) => {
              return (
                <div
                  className="fx-scattered fit-container fx-start-v "
                  key={item.pubkey + item.name}
                >
                  <div
                    className="fx-centered fx-start-v"
                    style={{ columnGap: "24px" }}
                  >
                    <UserProfilePicNOSTR
                      size={48}
                      img={item.picture}
                      user_id={item.pubkey}
                    />
                    <div className="fx-centered fx-col fx-start-v">
                      <ShortenKey id={item.pubkeyhashed} />
                      <p>{item.name}</p>
                      <p className="gray-c p-medium p-four-lines">
                        {item.about}
                      </p>
                    </div>
                  </div>
                  <div className="fx-centered">
                    {extras.length > 0 && (
                      <div
                        className="fx-centered box-pad-h-m"
                        style={{ minWidth: "32px" }}
                      >
                        <div className="bolt"></div>
                        <NumberShrink value={getZaps(item.pubkey)} />
                      </div>
                    )}
                    <Follow
                      toFollowKey={item.pubkey}
                      toFollowName={item.name}
                      bulk={true}
                      bulkList={bulkList}
                      setBulkList={setBulkList}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {bulkList.length > 0 && (
        <div
          className="fit-container fx-centered fx-col slide-up"
          style={{
            position: "fixed",
            bottom: 0,
            left: "0",
            background: "var(--white)",
            zIndex: 10000,
          }}
        >
          <div
            className="box-pad-h-m box-pad-v-m fx-centered"
            style={{ width: "min(100%, 400px)" }}
          >
            <button
              className="btn btn-normal fit-container"
              onClick={followUnfollow}
            >
              {bulkListStats.toFollow > 0 &&
                `Follow (${bulkListStats.toFollow})`}{" "}
              {bulkListStats.toFollow > 0 &&
                bulkListStats.toUnfollow > 0 &&
                " | "}
              {bulkListStats.toUnfollow > 0 &&
                `Unfollow (${bulkListStats.toUnfollow})`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const ArrowUp = () => {
  const [showArrow, setShowArrow] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
      if (document.querySelector(".fixed-container").scrollTop >= 600)
        setShowArrow(true);
      else setShowArrow(false);
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  const straightUp = () => {
    document.querySelector(".fixed-container").scrollTop = 0;
  };

  if (!showArrow) return null;
  return (
    <div
      style={{
        position: "fixed",
        right: "32px",
        bottom: "32px",
        minWidth: "40px",
        aspectRatio: "1/1",
        borderRadius: "var(--border-r-50)",
        backgroundColor: "var(--white)",
        filter: "invert()",
        zIndex: 100000,
      }}
      className="pointer fx-centered slide-up"
      onClick={straightUp}
    >
      <div className="arrow" style={{ transform: "rotate(180deg)" }}></div>
    </div>
  );
};
