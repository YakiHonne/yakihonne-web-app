import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import relaysOnPlatform from "../../Content/Relays";
import { nanoid } from "nanoid";

export default function ToPublishDraftsNOSTR({
  postContent = "",
  postTitle = "",
  edit = false,
  exit,
  warning = false,
}) {
  const { setToast, nostrKeys, nostrUser, setToPublish } = useContext(Context);
  const navigateTo = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [screen, setScreen] = useState(1);
  const [relaysToPublish, setRelaysToPublish] = useState([...relaysOnPlatform]);
  const [publishingState, setPublishingState] = useState([]);
  const [allRelays, setAllRelays] = useState([...relaysOnPlatform]);

  const Submit = async (kind = 30023) => {
    try {
      if (relaysToPublish.length === 0) return;
      setIsLoading(true);
      let tags = [
        [
          "client",
          "Yakihonne",
          "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
        ],
        ["published_at", `${Date.now()}`],
        ["d", edit || nanoid()],
        ["image", ""],
        ["title", postTitle],
        ["summary", ""],
      ];
      setToPublish({
        nostrKeys: nostrKeys,
        kind: kind,
        content: postContent,
        tags: tags,
        allRelays: relaysToPublish,
      });
      navigateTo("/my-articles");
      exit();
      return;
    } catch (err) {
      setToast({
        type: 2,
        desc: "An error has occurred!",
      });
    }
  };

  const handleRelaysToPublish = (relay) => {
    let index = relaysToPublish.findIndex((item) => item === relay);
    let tempArray = Array.from(relaysToPublish);
    if (index === -1) {
      setRelaysToPublish([...relaysToPublish, relay]);
      return;
    }
    tempArray.splice(index, 1);
    setRelaysToPublish(tempArray);
  };
  const checkIfChecked = (relay) => {
    let index = relaysToPublish.findIndex((item) => item === relay);
    if (index === -1) return false;
    return true;
  };

  return (
    <section className="fixed-container fx-centered">
      {screen === 1 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h sc-s-d box-pad-v"
          style={{
            width: "500px",
            borderColor: "var(--orange-main)",
          }}
        >
          <div className="fx-centered fx-col">
            <h4 className="p-centered">Save your draft</h4>
            <p className="gray-c p-medium">list of available relays</p>
            <p className="c1-c p-medium box-marg-s">
              (for more custom relays, check your settings)
            </p>
          </div>
          {warning && (
            <div className="sc-s-18 box-pad-v-s box-pad-h-s">
              <p className="orange-c p-medium p-centered">Warning</p>
              <p className="gray-c p-medium p-centered">
                Your article contains HTML elements which most likely will not
                be rendered on some clients or platforms.
              </p>
            </div>
          )}
          <div
            className="fit-container fx-centered fx-wrap"
            style={{ maxHeight: "40vh", overflow: "scroll" }}
          >
            {nostrUser?.relays?.length == 0 &&
              allRelays.map((url, index) => {
                if (index === 0)
                  return (
                    <label
                      className="fx-centered fx-start-h fit-container if"
                      htmlFor={`${url}-${index}`}
                      key={`${url}-${index}`}
                    >
                      <input
                        type="checkbox"
                        id={`${url}-${index}`}
                        checked
                        readOnly
                      />
                      <p>{url.split("wss://")[1]}</p>
                    </label>
                  );
                return (
                  <label
                    className="fx-centered fx-start-h fit-container if"
                    htmlFor={`${url}-${index}`}
                    key={`${url}-${index}`}
                  >
                    <input
                      type="checkbox"
                      id={`${url}-${index}`}
                      checked={checkIfChecked(url)}
                      onChange={() => handleRelaysToPublish(url)}
                    />
                    <p>{url.split("wss://")[1]}</p>
                  </label>
                );
              })}
            {nostrUser?.relays?.length > 0 &&
              nostrUser.relays.map((url, index) => {
                return (
                  <label
                    className="fx-centered fx-start-h fit-container if"
                    htmlFor={`${url}-${index}`}
                    key={`${url}-${index}`}
                  >
                    <input
                      type="checkbox"
                      id={`${url}-${index}`}
                      checked={checkIfChecked(url)}
                      onChange={() => handleRelaysToPublish(url)}
                    />
                    <p>{url.split("wss://")[1]}</p>
                  </label>
                );
              })}
          </div>
          <button
            className={`btn btn-full  ${
              relaysToPublish.length === 0 ? "btn-disabled" : "btn-normal"
            }`}
            onClick={() => Submit(30024)}
            disabled={isLoading}
          >
            {isLoading ? <LoadingDots /> : "Save draft"}
          </button>
          <button className="btn btn-gst-red btn-full" onClick={exit}>
            Cancel
          </button>
        </div>
      )}
      {screen === 3 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h sc-s-d box-pad-v"
          style={{
            width: "500px",
            borderColor: "var(--orange-main)",
          }}
        >
          <div className="fit-container fx-scattered fx-stretch fx-wrap">
            <div className="fx-centered fx-col" style={{ flex: "1 1 300px" }}>
              <h4 className="box-marg-s">Successful relays</h4>
              {publishingState.map((relay, index) => {
                if (relay.status)
                  return (
                    <div
                      className="fx-centered fx-start-h"
                      key={`${relay.url}-${index}`}
                    >
                      <div className="">👌🏻</div>
                      <p>{relay.url}</p>
                    </div>
                  );
              })}
            </div>
            <div
              style={{
                height: "100px",
                width: "1px",
                borderRight: "1px solid var(--dim-gray)",
                flex: "1 1 300px",
              }}
            ></div>
            {publishingState.filter((relay) => !relay.status).length > 0 && (
              <div className="fx-centered fx-col" style={{ flex: "1 1 300px" }}>
                <h4 className="box-marg-s">Failed relays</h4>
                {publishingState.map((relay, index) => {
                  if (!relay.status)
                    return (
                      <div
                        className="fx-centered fx-start-h"
                        key={`${relay.url}-${index}`}
                      >
                        <div className="p-medium">❌</div>
                        <p className="red-c">{relay.url}</p>
                      </div>
                    );
                })}
              </div>
            )}
          </div>
          <div className="fx-centered">
            <button
              className="btn btn-normal"
              onClick={() => navigateTo("/my-articles")}
            >
              Done!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
