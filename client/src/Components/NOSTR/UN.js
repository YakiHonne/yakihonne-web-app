import React, { Fragment, useContext, useEffect, useState } from "react";
import Date_ from "../Date_";
import { encryptEventData, filterRelays } from "../../Helpers/Encryptions";
import { finalizeEvent } from "nostr-tools";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import LoadingDots from "../LoadingDots";
import Counter from "../Counter";
import { getNoteTree } from "../../Helpers/Helpers";
import LoginNOSTR from "./LoginNOSTR";

export default function UN({
  sealedCauses = [],
  data,
  flashNewsAuthor,
  setTimestamp,
  state = "nmh",
  action = true,
  scaled = false,
}) {
  const { nostrUser, nostrKeys, setToPublish, setToast } = useContext(Context);
  const [content, setContent] = useState("");

  let findSource = data.tags.find((tag) => tag[0] === "source");
  let source = findSource ? findSource[1] : "";
  let isVoted =
    data?.ratings?.find((rating) => rating.pubkey === nostrKeys.pub) || false;
  const [vote, setVote] = useState("");
  const [causes, setCauses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toLogin, setToLogin] = useState(false);
  const [triggerUndo, setTriggerUndo] = useState(false);
  const platformCauses = {
    "+": [
      "Cites high-quality sources",
      "Easy to understand",
      "Directly addresses the post’s claim",
      "Provides important context",
      "Other",
    ],
    "-": [
      "Sources not included or unreliable",
      "Sources do not support note",
      "Incorrect information",
      "Opinion or speculation",
      "Typos or unclear language",
      "Misses key points or irrelevant",
      "Argumentative or biased language",
      "Harassment or abuse",
      "Other",
    ],
  };
  const [revotingPermission, setRevotingPermission] = useState(true);
  useEffect(() => {
    if (!nostrKeys) setVote("");
  }, [nostrKeys]);

  useEffect(() => {
    const parseContent = async () => {
      let res = await getNoteTree(data.content);
      setContent(res);
    };
    parseContent();
  }, [data]);
  const handleYes = () => {
    if (!nostrKeys) {
      setToLogin(true);
      return;
    }
    if (vote) {
      if (vote === "-") {
        setVote("+");
      }
      if (vote !== "-") {
        setVote("");
      }
      setCauses([]);
    }
    if (!vote) {
      setVote("+");
      setCauses([]);
    }
  };
  const handleNo = () => {
    if (!nostrKeys) {
      setToLogin(true);
      return;
    }
    if (vote) {
      if (vote === "+") {
        setVote("-");
      }
      if (vote !== "+") {
        setVote("");
      }
      setCauses([]);
    }
    if (!vote) {
      setVote("-");
      setCauses([]);
    }
  };
  const handleCauses = (cause) => {
    let index = causes.findIndex((item) => item === cause);
    if (index === -1) setCauses([...causes, cause]);
    if (index !== -1) {
      let tempCauses = Array.from(causes);
      tempCauses.splice(index, 1);
      setCauses(tempCauses);
    }
  };
  const handlePublishing = async () => {
    try {
      setIsLoading(true);
      let relaysToPublish = filterRelays(
        nostrUser?.relays || [],
        relaysOnPlatform
      );
      let tags = [];
      let created_at = Math.floor(Date.now() / 1000);

      tags.push(["e", data.id]);
      tags.push(["l", "UNCENSORED NOTE RATING"]);
      tags.push(["yaki_flash_news", encryptEventData(`${created_at}`)]);
      for (let cause of causes) tags.push(["cause", cause]);

      let event = {
        kind: 7,
        content: vote,
        created_at,
        tags,
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
        allRelays: relaysToPublish,
      });

      setTimeout(() => {
        setIsLoading(false);
        setVote("");
        setCauses([]);
        setTimestamp(Date.now());
      }, 3000);
    } catch (err) {
      setIsLoading(true);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while publishing this note",
      });
    }
  };
  const handleUndo = async () => {
    try {
      setIsLoading(true);
      let relaysToPublish = filterRelays(
        nostrUser?.relays || [],
        relaysOnPlatform
      );
      let tags = [];
      let created_at = Math.floor(Date.now() / 1000);

      tags.push(["e", isVoted.id]);
      tags.push(["l", "FLASH NEWS", "r"]);
      tags.push(["yaki_flash_news", encryptEventData(`${created_at}`)]);

      let event = {
        kind: 5,
        content: vote,
        created_at,
        tags,
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
        allRelays: relaysToPublish,
      });

      setTimeout(() => {
        setIsLoading(false);
        setVote("");
        setCauses([]);
        setTimestamp(Date.now());
        setTriggerUndo(false);
      }, 3000);
    } catch (err) {
      setIsLoading(true);
      console.log(err);
      setToast({
        type: 2,
        desc: "An error occurred while publishing this note",
      });
    }
  };

  if (state === "new") return null;
  return (
    <>
      {toLogin && <LoginNOSTR exit={() => setToLogin(false)} />}{" "}
      <div
        className="fit-container sc-s-18 fx-centered fx-col"
        style={{ rowGap: 0, overflow: "visible" }}
      >
        <div className="fit-container  box-pad-h-m box-pad-v-s">
          <div className="fit-container fx-scattered">
            <div className="fx-centered fit-container fx-start-h">
              {state === "nmh" && (
                <>
                  <div
                    style={{
                      minWidth: "12px",
                      minHeight: "12px",
                      borderRadius: "var(--border-r-50)",
                      backgroundColor: "var(--gray)",
                    }}
                  ></div>
                  <p className="p-bold p-medium gray-c">Needs more rating</p>
                </>
              )}
              {state === "sealed" && (
                <>
                  <div
                    style={{
                      minWidth: "12px",
                      minHeight: "12px",
                    }}
                    className="checkmark"
                  ></div>
                  <p className="p-bold p-medium green-c">Rated helpful</p>
                </>
              )}
              {state === "nh" && (
                <>
                  <div
                    style={{
                      minWidth: "12px",
                      minHeight: "12px",
                      borderRadius: "var(--border-r-50)",
                      backgroundColor: "var(--red-main)",
                    }}
                  ></div>
                  <p className="p-bold p-medium red-c">Rated not helpful</p>
                </>
              )}
            </div>
            {state === "nmh" && (
              <div
                className="sticker sticker-small sticker-gray-black"
                style={{ minWidth: "max-content" }}
              >
                Not sealed yet
              </div>
            )}
            {state === "sealed" && (
              <div
                className="sticker sticker-small sticker-green"
                style={{ minWidth: "max-content" }}
              >
                Sealed
              </div>
            )}
            {state === "nh" && (
              <div
                className="sticker sticker-small sticker-red"
                style={{ minWidth: "max-content" }}
              >
                Sealed
              </div>
            )}
          </div>
        </div>
        <hr />
        <div
          className="fit-container fx-centered fx-start-v fx-col box-pad-h-m box-pad-v-s"
          style={{ rowGap: "0px" }}
        >
          <div className="fit-container fx-centered fx-start-h">
            <p className="gray-c p-medium">
              Posted on{" "}
              <Date_ toConvert={new Date(data.created_at * 1000)} time={true} />
            </p>
            {source && (
              <>
                <span>&#x2022;</span>
                <a
                  target={"_blank"}
                  href={source}
                  onClick={(e) => e.stopPropagation()}
                  className="btn-text-gray pointer p-medium"
                >
                  <span>Source</span>
                </a>
              </>
            )}
          </div>
          <div
            className={`fx-centered fx-start-h fx-wrap ${
              scaled ? "p-medium" : ""
            }`}
            style={{ rowGap: 0, columnGap: "4px" }}
          >
            {content}
          </div>
        </div>
        {state !== "sealed" && action && (
          <>
            <hr />
            <div className="fit-container fx-scattered box-pad-h-m box-pad-v-s">
              {data.pubkey === nostrKeys.pub && (
                <p className="gray-c p-medium">
                  Your note awaits the community rating
                </p>
              )}
              {flashNewsAuthor === nostrKeys.pub && (
                <p className="gray-c p-medium">
                  This note awaits the community rating
                </p>
              )}
              {data.pubkey !== nostrKeys.pub &&
                flashNewsAuthor !== nostrKeys.pub && (
                  <>
                    {!isVoted && (
                      <>
                        <p className="gray-c">Do you find this helpful?</p>
                        <div className="fx-centered">
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip={"Yes"}
                            onClick={handleYes}
                            style={{
                              borderColor: vote === "+" ? "var(--gray)" : "",
                              backgroundColor:
                                vote === "+" ? "var(--dim-gray)" : "",
                            }}
                          >
                            <div className="thumbsup-24"></div>
                          </div>
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip={"No"}
                            onClick={handleNo}
                            style={{
                              borderColor: vote === "-" ? "var(--gray)" : "",
                              backgroundColor:
                                vote === "-" ? "var(--dim-gray)" : "",
                            }}
                          >
                            <div className="thumbsdown-24"></div>
                          </div>
                        </div>
                      </>
                    )}
                    {isVoted && (
                      <div
                        className="fx-scattered fit-container if pointer"
                        style={{
                          border: "none",
                          backgroundColor: "var(--dim-gray)",
                        }}
                      >
                        <div className="fx-centered">
                          <div
                            className="checkmark"
                            style={{ filter: "grayscale(100%)" }}
                          ></div>
                          <p className="p-medium">
                            You rated this note as{" "}
                            <span className="p-bold">
                              {isVoted.content === "+"
                                ? "helpful"
                                : "not helpful"}
                            </span>
                          </p>
                        </div>
                        {!triggerUndo && revotingPermission && (
                          <div>
                            <p
                              className="btn-text p-medium"
                              onClick={() => setTriggerUndo(true)}
                            >
                              Undo{" "}
                              <span className="orange-c">
                                (
                                <Counter
                                  date={isVoted.created_at}
                                  onClick={() => setRevotingPermission(false)}
                                />
                                )
                              </span>
                            </p>
                          </div>
                        )}
                        {triggerUndo && revotingPermission && (
                          <div className="fx-centered slide-right">
                            <button
                              className="btn btn-small btn-gst-red"
                              disabled={isLoading}
                              onClick={() => setTriggerUndo(false)}
                            >
                              {isLoading ? <LoadingDots /> : "Cancel"}
                            </button>
                            <button
                              className="btn btn-small btn-normal"
                              disabled={isLoading}
                              onClick={handleUndo}
                            >
                              {isLoading ? <LoadingDots /> : "Undo"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
            </div>
            {vote && (
              <div className="fit-container fx-centered fx-start-v fx-col box-pad-h-m box-pad-v-s">
                <p className="p-medium gray-c">Why do you think that?</p>
                {platformCauses[vote].map((cause) => {
                  return (
                    <label className="fit-container fx-scattered" key={cause}>
                      <p>{cause}</p>
                      <input
                        type="checkbox"
                        onClick={() => handleCauses(cause)}
                      />
                    </label>
                  );
                })}
                <hr />
                <div className="box-pad-v-s">
                  <p className="p-medium gray-c">Note</p>
                  <p className="p-medium orange-c">
                    Changing your rating will only be valid for 5 minutes, after
                    that you will no longer have the option to undo or change
                    it.
                  </p>
                </div>
              </div>
            )}
            {vote && (
              <>
                <hr />
                <div className="fit-container fx-centered box-pad-h-m box-pad-v-s">
                  <button
                    className="btn btn-normal fx"
                    onClick={handlePublishing}
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingDots /> : "Submit"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {(state === "sealed" || state === "nh") && sealedCauses.length > 0 && (
          <>
            <hr />
            <div className="fit-container fx-centered fx-start-h box-pad-h-m box-pad-v-s">
              <div
                className="msg-bubbles round-icon-tooltip"
                data-tooltip={
                  state === "sealed"
                    ? "Rated helpful for"
                    : "Rated not helpful for"
                }
              ></div>
              <div
                className="fx-centered fx-start-h fx-wrap"
                style={{ columnGap: "8px", rowGap: 0 }}
              >
                {sealedCauses.map((cause, index) => {
                  return (
                    <Fragment key={`${cause}-${index}`}>
                      <p className={scaled ? "p-small" : "p-medium"}>{cause}</p>
                      {index + 1 < sealedCauses.length && <span>&#x2022;</span>}
                    </Fragment>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
