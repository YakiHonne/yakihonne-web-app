import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import LoadingScreen from "../LoadingScreen";
import LoadingDots from "../LoadingDots";

export default function ToUpdateRelay({ exit, exitAndRefresh }) {
  const {
    setToast,
    nostrUser,
    isPublishing,
    setNostrUser,
    setUserRelays,
    nostrKeys,
    setToPublish,
  } = useContext(Context);
  const [tempNostrUserRelays, setTempNostrUserRelays] = useState(
    nostrUser?.relays || []
  );
  const [allRelays, setAllRelays] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customRelay, setCustomRelay] = useState("");
  const [searchedRelay, setSearchedRelay] = useState("");
  const [searchedResult, setSearchedResult] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await axios.get("https://api.nostr.watch/v1/online");
        setAllRelays(data.data);
        setIsLoaded(true);
      } catch {
        setToast({
          type: 2,
          desc: "Error has occurred!",
        });
        exit();
      }
    };
    fetchData();
  }, []);

  const addFromAllRelays = (url) => {
    if (checkIfRelayExist(url)) {
      deleteRelay(url);
      return;
    }
    setTempNostrUserRelays([...tempNostrUserRelays, url]);
  };
  const addCustomRelay = () => {
    if (customRelay) {
      if (customRelay.startsWith("wss://")) {
        if (checkIfRelayExist(customRelay)) {
          setCustomRelay("");
          setToast({
            type: 3,
            desc: "Relay is already on list!",
          });
          return false;
        }
        setTempNostrUserRelays([...tempNostrUserRelays, customRelay]);
        setCustomRelay("");
        return [...tempNostrUserRelays, customRelay];
      } else {
        setToast({
          type: 2,
          desc: "Relay format is invalid!",
        });
        return false;
      }
    } else {
      return tempNostrUserRelays;
    }
  };
  const deleteRelay = (url) => {
    let index = tempNostrUserRelays.findIndex((item) => item === url);
    let tempArray = Array.from(tempNostrUserRelays);
    tempArray.splice(index, 1);
    setTempNostrUserRelays(tempArray);
  };
  const checkIfRelayExist = (input) => {
    let status = tempNostrUserRelays.find((item) => item === input);
    return status ? true : false;
  };
  const handleSearchRelay = (e) => {
    let value = e.target.value;
    let tempArray = [];
    setSearchedRelay(value);
    if (!value) {
      setSearchedResult([]);
      return;
    }
    for (let url of allRelays) if (url.includes(value)) tempArray.push(url);
    setSearchedResult(tempArray);
  };
  const saveRelays = async () => {
    let relaysToAdd = addCustomRelay();
    if (relaysToAdd === false) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    saveInKind10002();
    exit();
  };

  const saveInKind10002 = async () => {
    try {
      let tags = convertArrayToKind10002();
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 10002,
        content: "",
        tags: tags,
        allRelays: tempNostrUserRelays,
      });
      let tempUser = { ...nostrUser };
      tempUser.relays = tempNostrUserRelays;
      setNostrUser(tempUser);
      setUserRelays(tempNostrUserRelays);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  };

  const convertArrayToKind10002 = () => {
    let tempArray = [];
    for (let relay of tempNostrUserRelays) {
      tempArray.push(["r", relay]);
    }
    return tempArray;
  };

  if (!isLoaded) return <LoadingScreen />;
  return (
    <section
      className="fixed-container fx-centered fx-wrap box-pad-h box-pad-v"
      style={{
        pointerEvents: isLoading ? "none" : "auto",
        overflow: "scroll",
        overflowX: "hidden",
      }}
    >
      <div
        className="fx-centered fx-wrap fx-start-v "
        style={{ rowGap: "32px", width: "min(100%, 1000px)" }}
      >
        <div
          className="fx-centered fx-col slide-up"
          style={{
            width: "min(100%, 350px)",
            flex: "1 1 350px",
          }}
        >
          <div
            className="fit-container fx-centered fx-start-h fx-col box-pad-h"
            style={{
              maxHeight: "30vh",
              overflow: "scroll",
              overflowX: "hidden",
            }}
          >
            <div
              className="fx-scattered fit-container box-marg-s"
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "var(--white)",
              }}
            >
              <h4>All relays</h4>
              <input
                type="search"
                className="if ifs-small"
                placeholder="search relay"
                value={searchedRelay}
                onChange={handleSearchRelay}
              />
            </div>
            {searchedRelay && searchedResult.length === 0 && (
              <div className="fit-container fx-centered box-marg-full box-pad-h">
                <p className="gray-c italic-txt">No relay was found</p>
              </div>
            )}
            {searchedRelay &&
              searchedResult.map((relay, index) => {
                let status = checkIfRelayExist(relay);
                return (
                  <div
                    key={`${relay}-${index}`}
                    className="if fit-container fx-scattered fx-shrink pointer"
                    style={{ borderColor: status ? "var(--green-main)" : "" }}
                    onClick={() => addFromAllRelays(relay)}
                  >
                    <p className={status ? "green-c" : ""}>{relay}</p>
                    {status ? (
                      <div>
                        <p className="green-c p-big">&#10003;</p>
                      </div>
                    ) : (
                      <div>
                        <p className="p-big">&#43;</p>
                      </div>
                    )}
                  </div>
                );
              })}
            {!searchedRelay &&
              allRelays.map((relay, index) => {
                let status = checkIfRelayExist(relay);
                return (
                  <div
                    key={`${relay}-${index}`}
                    className="if fit-container fx-scattered fx-shrink pointer"
                    style={{ borderColor: status ? "var(--green-main)" : "" }}
                    onClick={() => addFromAllRelays(relay)}
                  >
                    <p className={status ? "green-c" : ""}>{relay}</p>
                    {status ? (
                      <div>
                        <p className="green-c p-big">&#10003;</p>
                      </div>
                    ) : (
                      <div>
                        <p className="p-big">&#43;</p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
        <div
          className="fx-centered fx-col slide-up"
          style={{
            width: "min(100%, 350px)",
            flex: "1 1 350px",
          }}
        >
          <div
            className="fit-container fx-centered fx-start-h fx-col box-pad-h"
            style={{
              maxHeight: "25vh",
              overflow: "scroll",
              overflowX: "hidden",
            }}
          >
            <div
              className="fx-scattered fit-container box-marg-s"
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "var(--white)",
                zIndex: 10,
              }}
            >
              <h4>My relays</h4>
            </div>
            {tempNostrUserRelays.map((relay, index) => {
              return (
                <div
                  key={`${relay}-${index}`}
                  className="if fit-container fx-scattered fx-shrink pointer"
                >
                  <p>{relay}</p>
                  <div
                    className="trash"
                    onClick={() => deleteRelay(relay)}
                  ></div>
                </div>
              );
            })}
          </div>
          <div className="box-pad-h fit-container">
            <div className="fit-container fx-centered">
              <input
                type="text"
                className="if ifs-full"
                placeholder="Relay url"
                value={customRelay}
                onChange={(e) => setCustomRelay(e.target.value)}
              />
              <button className="btn btn-normal" onClick={addCustomRelay}>
                Add
              </button>
            </div>
            <div className="fx-centered box-pad-v">
              <button
                className="btn btn-gst-red fx"
                onClick={exit}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : "Cancel"}
              </button>
              <button
                className="btn btn-normal fx"
                onClick={saveRelays}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
