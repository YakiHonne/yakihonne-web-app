import { finalizeEvent } from "nostr-tools";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "../Context/Context";
import LoadingDots from "./LoadingDots";
import { SimplePool } from "nostr-tools";
import LoadingBar from "./LoadingBar";
import axiosInstance from "../Helpers/HTTP_Client";
const pool = new SimplePool();

const action_key_from_kind = {
  3: "follow_yaki",
  10002: "relays_setup",
  30078: "topics_setup",
  1: "comment_post",
  11: "flashnews_post",
  111: "un_write",
  7: "reaction",
  77: "reaction",
  777: "un_rate",
  30003: "bookmark",
  30004: "curation_post",
  30005: "curation_post",
  30023: "article_post",
  30024: "article_draft",
  34235: "video_post",
  4: "dms-5",
  44: "dms-10",
  1059: "dms-5",
  10599: "dms-10",
  username: "username",
  bio: "bio",
  profile_picture: "profile_picture",
  cover: "cover",
  nip05: "nip05",
  luds: "luds",
};

export default function Publishing() {
  const {
    tempUserMeta,
    setTempUserMeta,
    toPublish,
    setToPublish,
    setToast,
    isPublishing,
    setPublishing,
    updateYakiChestStats,
    setUpdatedActionFromYakiChest,
    userFollowings,
  } = useContext(Context);
  const [showDetails, setShowDetails] = useState(false);
  const [startPublishing, setStartPublishing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeoutP, setTimeoutP] = useState(false);
  const [okRelays, setOkRelays] = useState([]);
  const [failedRelays, setFailedRelays] = useState([]);
  const [signedEvent, setSignedEvent] = useState(false);
  const [action_key, setActionKey] = useState(false);

  useEffect(() => {
    const publishPost = async () => {
      setFailedRelays([]);
      setOkRelays([]);
      setStartPublishing(false);
      setShowDetails(false);
      setIsFinished(false);
      setTimeoutP(false);

      let {
        nostrKeys,
        kind,
        content,
        tags,
        allRelays,
        created_at,
        eventInitEx,
      } = toPublish;
      let ak = getActionKey();
      setActionKey(ak);
      if (eventInitEx) {
        setFailedRelays(allRelays);
        setStartPublishing(true);
        setPublishing(true);
        setSignedEvent(eventInitEx);
        initPublishing(allRelays, eventInitEx);
        return;
      }
      setFailedRelays(allRelays);
      let event = {
        kind,
        content,
        created_at: created_at || Math.floor(Date.now() / 1000),
        tags,
      };

      if (nostrKeys.ext) {
        try {
          event = await window.nostr.signEvent(event);
          setStartPublishing(true);
        } catch (err) {
          setToPublish(false);
          console.log(err);
          return false;
        }
      } else {
        event = finalizeEvent(event, nostrKeys.sec);
        setStartPublishing(true);
      }

      setPublishing(true);
      setSignedEvent(event);
      initPublishing(allRelays, event);
    };
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    if (toPublish) publishPost();
    return () => {
      clearTimeout(timeoutP);
    };
  }, [toPublish]);

  useEffect(() => {
    let { allRelays } = toPublish;
    if (failedRelays.length === 0) {
      setIsFinished(true);
      setPublishing(false);
    }
    if (isFinished && okRelays.length > 0) {
      updateYakiChest();
      if (window.location.pathname === "/messages") setToPublish(false);
    }
  }, [isFinished, okRelays]);

  const initPublishing = async (relays, event) => {
    try {
      for (let i = 0; i < relays.length; i++)
        Promise.allSettled(pool.publish([relays[i]], event)).then((results) => {
          results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value === "") {
              setFailedRelays((prev) => {
                let tempArray = Array.from(prev);
                let _index = tempArray.findIndex((item) => relays[i] === item);
                if (_index !== -1) {
                  tempArray.splice(_index, 1);
                  return tempArray;
                }
                return prev;
              });
              if (["article_post", "article_draft"].includes(action_key)) {
                localStorage.removeItem("yai-last-article-content");
                localStorage.removeItem("yai-last-article-title");
              }
              setOkRelays((re) => [...re, relays[i]]);
            }
          });
        });
    } catch (err) {
      console.log(err);
    }

    let timeout = setTimeout(() => {
      setIsFinished(true);
      setPublishing(false);
    }, 7000);
    setTimeoutP(timeout);
  };

  const exit = () => {
    setToPublish(false);
    setFailedRelays([]);
    setOkRelays([]);
    setStartPublishing(false);
    setShowDetails(false);
    setIsFinished(false);
    setTimeoutP(false);
  };

  const retry = () => {
    setOkRelays([]);
    setStartPublishing(true);
    setShowDetails(false);
    setIsFinished(false);
    setTimeoutP(false);
    initPublishing(failedRelays, signedEvent);
  };

  const updateYakiChest = async () => {
    try {
      if (Array.isArray(action_key)) {
        for (let action_key_ of action_key) {
          let data = await axiosInstance.post("/api/v1/yaki-chest", {
            action_key: action_key_,
          });
          let { user_stats, is_updated } = data.data;

          if (is_updated) {
            setUpdatedActionFromYakiChest(is_updated);
            updateYakiChestStats(user_stats);
          }
        }
        return;
      }
      if (typeof action_key === "string") {
        let data = await axiosInstance.post("/api/v1/yaki-chest", {
          action_key,
        });
        let { user_stats, is_updated } = data.data;

        if (is_updated) {
          setUpdatedActionFromYakiChest(is_updated);
          updateYakiChestStats(user_stats);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getActionKey = () => {
    let { kind, content, tags, eventInitEx } = toPublish;

    if (eventInitEx) {
      let kind_ = eventInitEx.kind;
      if (kind_ === 1) {
        return action_key_from_kind[getKind1FromTags(eventInitEx.tags)];
      }
      if (kind_ === 7) {
        return action_key_from_kind[
          getKind7FromTags(eventInitEx.content, eventInitEx.tags)
        ];
      }
      if (kind === 4) {
        return action_key_from_kind[getKind4FromEvent(eventInitEx.tags)];
      }
      return action_key_from_kind[kind_];
    }

    if (kind === 1) {
      return action_key_from_kind[getKind1FromTags(tags)];
    }
    if (kind === 7) {
      return action_key_from_kind[getKind7FromTags(content, tags)];
    }
    if (kind === 4) {
      return action_key_from_kind[getKind4FromEvent(tags)];
    }
    if (kind === 3) {
      let checkYakiInFollowings = userFollowings.find(
        (item) =>
          item ===
          "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3"
      );
      if (checkYakiInFollowings) return action_key_from_kind[3];
      if (!checkYakiInFollowings) return false;
    }
    if (kind === 0) {
      let updatedUserMeta = getUpdatedMetaProperty(content);
      if (!Array.isArray(updatedUserMeta)) return false;
      setTempUserMeta(JSON.parse(content));
      let keys = updatedUserMeta.map((key) => action_key_from_kind[key]);

      return keys;
    }

    return action_key_from_kind[kind];
  };

  const getKind4FromEvent = (tags) => {
    let receiver = tags.find(
      (tag) =>
        tag[0] === "p" &&
        tag[1] ===
          "20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3"
    );
    if (receiver) return 44;
    return 4;
  };
  const getKind1FromTags = (tags) => {
    let l = tags.find((tag) => tag[0] === "l");
    if (!l) return 1;
    if (l[1] === "FLASH NEWS") return 11;
    if (l[1] === "UNCENSORED NOTE") return 111;
  };
  const getKind7FromTags = (content, tags) => {
    let l = tags.find((tag) => tag[0] === "l");
    if (!l) {
      if (content === "+") return 7;
      if (content === "-") return 77;
    }

    if (l[1] === "UNCENSORED NOTE RATING") return 777;
  };
  const getUpdatedMetaProperty = (content) => {
    let tempUser = tempUserMeta;
    let updatedUser = JSON.parse(content);
    let metadataKeys = [];
    if (tempUser.about !== updatedUser.about) metadataKeys.push("bio");
    if (tempUser.banner !== updatedUser.banner) metadataKeys.push("cover");
    if (
      tempUser.display_name !== updatedUser.display_name ||
      tempUser.name !== updatedUser.name
    )
      metadataKeys.push("username");
    if (
      tempUser.lud06 !== updatedUser.lud06 ||
      tempUser.lud16 !== updatedUser.lud16
    )
      metadataKeys.push("luds");
    if (tempUser.nip05 !== updatedUser.nip05) metadataKeys.push("nip05");
    if (tempUser.picture !== updatedUser.picture)
      metadataKeys.push("profile_picture");

    if (metadataKeys.length > 0) return metadataKeys;
    return false;
  };

  if (!toPublish) return;
  if (window.location.pathname === "/messages") return;
  if (showDetails)
    return (
      <div
        className="fixed-container fx-centered"
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(false);
        }}
        style={{ zIndex: 200000 }}
      >
        <div
          className="fx-centered fx-start-h fx-col slide-up box-pad-h"
          style={{
            width: "500px",
            maxHeight: "80vh",
            overflow: "scroll",
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <div className="fit-container fx-scattered fx-stretch fx-wrap">
            <div
              className="fx-centered fx-start-v fx-col"
              style={{ flex: "1 1 300px" }}
            >
              {okRelays.length > 0 && (
                <p className="p-medium gray-c">Successful relays</p>
              )}
              {okRelays.map((relay, index) => {
                return (
                  <div
                    className="fx-scattered if ifs-full"
                    key={`${relay}-${index}`}
                  >
                    <p>{relay}</p>
                    <div className="">👌🏻</div>
                  </div>
                );
              })}
            </div>

            <div
              className="fx-centered fx-start-v fx-col"
              style={{ flex: "1 1 300px" }}
            >
              {failedRelays.length > 0 && (
                <p className="p-medium gray-c">Failed relays</p>
              )}
              {failedRelays.map((relay, index) => {
                return (
                  <div
                    className="fx-scattered if ifs-full"
                    key={`${relay}-${index}`}
                  >
                    <p className="red-c">{relay}</p>
                    <div className="p-medium">❌</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="box-pad-v-s fx-centered">
            <button
              className="btn btn-normal"
              onClick={() => setShowDetails(false)}
            >
              Done!
            </button>
            {failedRelays.length > 0 && (
              <button className="btn btn-gst" onClick={retry}>
                Retry!
              </button>
            )}
          </div>
        </div>
      </div>
    );
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "max-content",
        zIndex: 200000,
      }}
      className="fx-centered box-pad-v box-pad-h"
    >
      <div className="slide-down fit-container fx-centered">
        <div
          className="fx-centered sc-s-18 box-pad-h-m box-pad-v-m"
          style={{ width: "min(100%, 400px)", position: "relative" }}
        >
          {startPublishing && (
            <div className="fx-scattered fit-container">
              <div
                className="fx-start-v fx-centered fx-col "
                style={{ width: "80%", height: "max-content" }}
              >
                <div className="fx-centered">
                  <p className="p-medium ">
                    {okRelays.length} /{" "}
                    <span className="gray-c">
                      {failedRelays.length + okRelays.length} relays succeeded
                    </span>
                  </p>
                  {!isFinished && (
                    <div>
                      <LoadingDots />
                    </div>
                  )}
                  {isFinished && failedRelays.length > 0 && (
                    <span className="orange-c p-medium">
                      ({failedRelays.length} relay(s) timedout)
                    </span>
                  )}
                </div>
                <LoadingBar
                  current={okRelays.length}
                  total={failedRelays.length + okRelays.length}
                  full={true}
                />
                {isFinished && (
                  <p
                    className="pointer btn-text-gray p-medium"
                    style={{ height: "max-content" }}
                    onClick={() => setShowDetails(true)}
                  >
                    Details
                  </p>
                )}
              </div>
              <div className="fx-centered">
                <div className="box-pad-h-m"></div>
              </div>
              {!isPublishing && (
                <div className="close" onClick={exit}>
                  <div></div>
                </div>
              )}
            </div>
          )}
          {!startPublishing && (
            <div className="fx-centered">
              <p className="gray-c"> Waiting for siging event</p>{" "}
              <LoadingDots />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
