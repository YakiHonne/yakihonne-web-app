import React, { useContext, useState } from "react";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";

export default function PublishRelaysPicker({ confirmPublishing, exit, button = "Publish" }) {
  const { nostrUser } = useContext(Context);
  const [relaysToPublish, setRelaysToPublish] = useState([...relaysOnPlatform]);
  const [allRelays, setAllRelays] = useState([...relaysOnPlatform]);

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
    <section className="fixed-container fx-centered" style={{zIndex: "10001"}}>
      <div
        className="fx-centered fx-col slide-up box-pad-h"
        style={{
          width: "500px",
        }}
      >
        <div className="fx-centered fx-col">
          <h4 className="p-centered">Publish to your favorite relays</h4>
          <p className="gray-c p-medium">list of available relays</p>
          <p className="c1-c p-medium box-marg-s">
            (for more custom relays, check your settings)
          </p>
        </div>
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
              if (index < 1)
                return (
                  <label
                    className="fx-centered fx-start-h fit-container if if-disabled"
                    htmlFor={`${url}-${index}`}
                    key={`${url}-${index}`}
                  >
                    <input
                      type="checkbox"
                      id={`${url}-${index}`}
                      checked
                      readOnly
                    />
                    <p className="c1-c">{url.split("wss://")[1]}</p>
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
        </div>

        <button
          className="btn btn-full  btn-normal"
          onClick={() => {
            confirmPublishing([...relaysToPublish]);
            exit();
          }}
        >
          {button}
        </button>
        <button className="btn btn-text-red" onClick={exit}>Exit</button>
      </div>
    </section>
  );
}
