import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import LoadingScreen from "../LoadingScreen";
import { publishPost } from "../../Helpers/NostrPublisher";
import LoadingDots from "../LoadingDots";

export default function ToUpdateRelay({ exit, exitAndRefresh }) {
  const { setToast, nostrUser, nostrKeys } = useContext(Context);
  const [tempNostrUserRelays, setTempNostrUserRelays] = useState(
    nostrUser.relays || []
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
        return [...tempNostrUserRelays, customRelay]
      } else {
        setToast({
          type: 2,
          desc: "Relay format is invalid!",
        });
        return false;
      }
    } else {
      return tempNostrUserRelays
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
    let relaysToAdd = addCustomRelay()
    if(relaysToAdd === false) return
    setIsLoading(true);
    let kind3 = await saveInKind3(relaysToAdd);
    let kind10002 = await saveInKind10002(relaysToAdd);
    if (kind10002 && kind3) {
      setToast({
        type: 1,
        desc: "Relays are saved successfully!",
      });
      setIsLoading(false);
      window.location = "/settings";
      return;
    }
    setToast({
      type: 2,
      desc: "Could not update relays list!",
    });
    setIsLoading(false);
  };
  const saveInKind3 = async (relays) => {
    try {
      let content = convertArrayToKind3(relays);
      let res = await publishPost(
        nostrKeys,
        3,
        content,
        [],
        [relaysOnPlatform[0]]
      );
      if (res.find((item) => item.status)) return true;
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  const saveInKind10002 = async (relays) => {
    try {
      let tags = convertArrayToKind10002(relays);
      let res = await publishPost(nostrKeys, 10002, "", tags, [
        relaysOnPlatform[0],
      ]);
      if (res.find((item) => item.status)) return true;
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  const convertArrayToKind3 = (relays) => {
    let tempObj = {};
    for (let relay of relays) {
      tempObj[relay] = { read: true, write: true };
    }
    return JSON.stringify(tempObj);
  };
  const convertArrayToKind10002 = (relays) => {
    let tempArray = [];
    for (let relay of relays) {
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
      <div className="fx-centered fx-wrap fx-start-v " style={{rowGap: "32px", width: "min(100%, 1000px)"}}>
        <div
          className="fx-centered fx-col slide-up"
          style={{
            // maxWidth: "500px",
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
                    {/* <h4 className="gray-c"></h4> */}
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
                    {/* <h4 className="gray-c"></h4> */}
                  </div>
                );
              })}
          </div>
          {/* <div className="fx-centered fit-container">
          <button className="btn btn-gst-red fx" onClick={exit}>
            Cancel
          </button>
          <button className="btn btn-normal fx">Save</button>
        </div> */}
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
              // if ([0, 1,2,3,4].includes(index))
              //   return (
              //     <div
              //       key={`${relay}-${index}`}
              //       className="if fit-container fx-centered  fx-start-h if-disabled fx-shrink"
              //     >
              //       <p className="c1-c">{relay}</p>
              //     </div>
              //   );
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
