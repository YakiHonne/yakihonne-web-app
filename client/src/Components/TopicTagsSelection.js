import React, { useContext, useEffect, useMemo, useState } from "react";
import relaysOnPlatform from "../Content/Relays";
import TopicsTags from "../Content/TopicsTags";
import { Context } from "../Context/Context";
import { filterRelays } from "../Helpers/Encryptions";
const defaultTopicIcon =
  "https://yakihonne.s3.ap-east-1.amazonaws.com/topics_icons/default.png";

const getSuggestions = (custom) => {
  if (!custom) return [];
  let list = TopicsTags.map((item) => [item.main_tag, ...item.sub_tags]).flat();
  return list.filter((item) =>
    item.toLowerCase().includes(custom.toLowerCase())
  );
};

export default function TopicTagsSelection({ exit }) {
  const {
    nostrKeys,
    nostrUser,
    nostrUserTopics,
    setNostrUserTopics,
    setToPublish,
    isPublishing,
    setToast,
    buzzFeedSources,
  } = useContext(Context);
  const [currentTopics, setCurrentTopics] = useState([]);
  const [newTopics, setNewTopics] = useState([]);
  const [customTopics, setCustomTopics] = useState([]);
  const [customTopic, setCustomTopic] = useState("");
  const topicSuggestions = useMemo(() => {
    return getSuggestions(customTopic);
  }, [customTopic]);
  useEffect(() => {
    setCurrentTopics(nostrUserTopics);
  }, [nostrUserTopics]);

  const checkTopic = (topic) => {
    let status_1 = [...newTopics].find(
      (item) => item.toLowerCase() === topic.toLowerCase()
    );
    let status_2 = [...currentTopics].find(
      (item) => item.toLowerCase() === topic.toLowerCase()
    );
    return { status: status_1 || status_2, new: status_1 ? true : false };
  };
  const checkTopicInList = (topic) => {
    let isBFS = buzzFeedSources.find(
      (item) => item.name.toLowerCase() === topic.toLowerCase()
    );
    if (isBFS) return isBFS;
    return TopicsTags.find(
      (item) => item.main_tag.toLowerCase() === topic.toLowerCase()
    );
  };

  const handleRemoveOldTopic = (index) => {
    let tempArray = Array.from(currentTopics);
    tempArray.splice(index, 1);
    setCurrentTopics(tempArray);
  };

  const handleAddNewTopic = (topic) => {
    console.log(topic);
    let tempArray = Array.from(newTopics);
    let index = tempArray.findIndex(
      (item) => item?.toLowerCase() === topic.toLowerCase()
    );

    if (index === -1) {
      setNewTopics([...newTopics, topic]);
      return;
    }
    tempArray.splice(index, 1);
    setNewTopics(tempArray);
  };

  const saveAndExit = () => {
    localStorage.setItem("topic-popup", `${Date.now()}`);
    exit();
  };

  const subscribe = () => {
    if (!nostrKeys) {
      return;
    }
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    setToPublish({
      nostrKeys: nostrKeys,
      kind: 30078,
      content: "",
      tags: [
        ["d", "MyFavoriteTopicsInYakihonne"],
        ...[...currentTopics, ...newTopics].map((item) => ["t", item]),
      ],
      allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
    });
    setNostrUserTopics([...currentTopics, ...newTopics]);
    saveAndExit();
  };
  const handleCustomTopic = (keyword) => {
    if (keyword) {
      let status = checkTopic(keyword.trim());
      if (status.status) {
        setCustomTopic("");
        return;
      }
      if (!status.status) {
        let status_2 = checkTopicInList(keyword.trim());
        if (status_2) {
          setNewTopics([...newTopics, keyword.trim()]);
          setCustomTopic("");
          return;
        }
        setNewTopics([...newTopics, keyword.trim()]);
        setCustomTopics([
          ...customTopics,
          {
            main_tag: keyword,
            icon: defaultTopicIcon,
            sub_tags: [],
          },
        ]);
      }
      setCustomTopic("");
    }
  };
  return (
    <div
      className="fixed-container fx-centered"
      onClick={(e) => {
        e.stopPropagation();
        saveAndExit();
      }}
    >
      <section
        className="sc-s box-pad-h-m box-pad-v fx-centered fx-start-v"
        style={{
          width: "min(100%, 600px)",
          maxHeight: "80vh",
          position: "relative",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="close" onClick={saveAndExit}>
          <div></div>
        </div>
        <div className="fx-centered fx-col fx-start-h">
          <h3>Topics</h3>
          <p className="gray-c box-marg-s">
            Subscribe to what interests you the most
          </p>
          <div
            className="fx-centered fx-wrap box-pad-h"
            style={{ maxHeight: "50vh", overflow: "scroll" }}
          >
            {currentTopics.length > 0 && (
              <div className="fit-container fx-scattered">
                <p className="gray-c p-medium">Your topics</p>
                <div style={{ width: "80%" }}>
                  <hr />
                  <hr />
                </div>
              </div>
            )}
            {currentTopics.map((item, index) => {
              let status = checkTopicInList(item);

              return (
                <div
                  className="sc-s-18 fx-centered fx-col box-pad-h-m box-pad-v-m  pointer option"
                  key={`${item}-${index}`}
                  onClick={() => handleRemoveOldTopic(index)}
                  style={{ flex: "1 1 150px", borderColor: "var(--c1)" }}
                >
                  <p className="p-medium p-centered">{item}</p>
                  {status && (
                    <img width="48" height="48" src={status.icon} alt={item} />
                  )}
                  {!status && (
                    <img
                      width="48"
                      height="48"
                      src={defaultTopicIcon}
                      alt={item}
                    />
                  )}

                  <p className="p-medium pale-c1-c">&#x2212; Unsubscribe</p>
                </div>
              );
            })}
            {currentTopics.length > 0 && (
              <>
                <div style={{ flex: "1 1 150px" }}></div>
                <div style={{ flex: "1 1 150px" }}></div>
              </>
            )}

            {(newTopics.length > 0 || currentTopics.length > 0) && (
              <div className="fit-container fx-scattered">
                <p className="gray-c p-medium">More topics</p>
                <div style={{ width: "80%" }}>
                  <hr />
                  <hr />
                </div>
              </div>
            )}
            {[...TopicsTags, ...customTopics].map((item, index) => {
              let status = checkTopic(item.main_tag);
              if (status.status && !status.new) return;
              if (status.status)
                return (
                  <div
                    className="sc-s-18 fx-centered fx-col box-pad-h-m box-pad-v-m  pointer option"
                    onClick={() => handleAddNewTopic(item.main_tag)}
                    key={`${item.main_tag}-${index}`}
                    style={{
                      flex: "1 1 150px",
                      borderColor: "var(--green-main)",
                    }}
                  >
                    <p className="p-medium p-centered">{item.main_tag}</p>
                    <img
                      width="48"
                      height="48"
                      src={item.icon}
                      alt={item.main_tag}
                    />

                    <p className="p-medium gray-c">&#x2212; Remove</p>
                  </div>
                );
              return (
                <div
                  className="sc-s-18 fx-centered fx-col box-pad-h-m box-pad-v-m  pointer option"
                  onClick={() => handleAddNewTopic(item.main_tag)}
                  key={`${item.main_tag}-${index}`}
                  style={{ flex: "1 1 150px" }}
                >
                  <p className="p-medium p-centered">{item.main_tag}</p>
                  <img
                    width="48"
                    height="48"
                    src={item.icon}
                    alt={item.main_tag}
                  />
                  <p className="p-medium gray-c">&#xFF0B; Subscribe</p>
                </div>
              );
            })}
            <div style={{ flex: "1 1 150px" }}></div>
            <div style={{ flex: "1 1 150px" }}></div>
            {(newTopics.length > 0 || currentTopics.length > 0) && (
              <div className="fit-container fx-scattered">
                <p className="gray-c p-medium">Buzz feed sources</p>
                <div style={{ width: "70%" }}>
                  <hr />
                  <hr />
                </div>
              </div>
            )}
            {buzzFeedSources.map((item, index) => {
              let status = checkTopic(item.name);
              // if (status.status && !status.new) return;
              if (status.status)
                return (
                  <div
                    className="sc-s-18 fx-centered fx-col box-pad-h-m box-pad-v-m  pointer option"
                    onClick={() => handleAddNewTopic(item.name)}
                    key={`${item.name}-${index}`}
                    style={{
                      flex: "1 1 150px",
                      borderColor: "var(--green-main)",
                    }}
                  >
                    <p className="p-medium p-centered">{item.name}</p>
                    <img
                      width="48"
                      height="48"
                      src={item.icon}
                      alt={item.name}
                    />

                    <p className="p-medium gray-c">&#x2212; Remove</p>
                  </div>
                );
              return (
                <div
                  className="sc-s-18 fx-centered fx-col box-pad-h-m box-pad-v-m  pointer option"
                  onClick={() => handleAddNewTopic(item.name)}
                  key={`${item.name}-${index}`}
                  style={{ flex: "1 1 150px" }}
                >
                  <p className="p-medium p-centered">{item.name}</p>
                  <img width="48" height="48" src={item.icon} alt={item.name} />
                  <p className="p-medium gray-c">&#xFF0B; Subscribe</p>
                </div>
              );
            })}
            <div style={{ flex: "1 1 150px" }}></div>
            <div style={{ flex: "1 1 150px" }}></div>
            <div className="fit-container fx-scattered">
              <p className="gray-c p-medium">Don't see yours?</p>
              <div style={{ width: "75%" }}>
                <hr />
                <hr />
              </div>
            </div>
            <div
              className="fit-container fx-centered"
              style={{ position: "relative" }}
            >
              {topicSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "-10px",
                    left: 0,
                    width: "100%",
                    maxHeight: "200px",
                    transform: "translateY(-100%)",
                    overflow: "scroll",
                  }}
                  className="sc-s-18 fx-centered fx-start-v fx-start-h fx-col box-pad-h-m box-pad-v-m"
                >
                  <h5>Topics suggestions</h5>
                  {topicSuggestions.map((item, index) => {
                    return (
                      <button
                        key={`${item}-${index}`}
                        className={`btn-text-gray pointer fit-container`}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          paddingLeft: 0,
                          fontSize: "1rem",
                          textDecoration: "none",

                          transition: ".4s ease-in-out",
                        }}
                        onClick={() => handleCustomTopic(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              )}
              <input
                type="text"
                className="if ifs-full"
                placeholder="Custom topic"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
              />
              <button
                className="btn btn-normal"
                style={{ width: "50%" }}
                onClick={() => handleCustomTopic(customTopic)}
              >
                Add topic
              </button>
            </div>
          </div>
          <div className="fx-centered fx-col fit-container box-pad-h">
            <button
              className={`btn btn-full ${
                newTopics.length > 0 ||
                currentTopics.length !== nostrUserTopics.length
                  ? "btn-normal"
                  : "btn-disabled"
              }`}
              onClick={subscribe}
              disabled={
                !(
                  newTopics.length ||
                  currentTopics.length !== nostrUserTopics.length
                )
              }
            >
              Subscribe{" "}
              {newTopics.length > 0 && <>({newTopics.length} new topics)</>}
            </button>
            {!localStorage.getItem("topic-popup") && (
              <button className="btn btn-text" onClick={saveAndExit}>
                Skip
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
