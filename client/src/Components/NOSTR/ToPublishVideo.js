import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import LoadingDots from "../LoadingDots";
import relaysOnPlatform from "../../Content/Relays";
import TopicsTags from "../../Content/TopicsTags";
import UserSearchBar from "../UserSearchBar";
import NProfilePreviewer from "./NProfilePreviewer";
import UploadFile from "../UploadFile";

const getSuggestions = (custom) => {
  if (!custom) return [];
  let list = TopicsTags.map((item) => [item.main_tag, ...item.sub_tags]).flat();
  return list.filter((item) =>
    item.toLowerCase().includes(custom.toLowerCase())
  );
};

export default function ToPublishVideo({ tags, title, edit = false, exit }) {
  const { setToast, nostrKeys, nostrUser, setToPublish } = useContext(Context);
  const navigateTo = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPrev, setThumbnailPrev] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [tempTag, setTempTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [screen, setScreen] = useState(1);
  const [finalStepContent, setFinalStepContent] = useState(0);
  const [zapSplit, setZapSplit] = useState([["zap", nostrKeys.pub, "", "100"]]);
  const [zapSplitEnabled, setZapSplitEnabled] = useState(false);
  const [relaysToPublish, setRelaysToPublish] = useState([...relaysOnPlatform]);
  const [publishingState, setPublishingState] = useState([]);

  const [allRelays, setAllRelays] = useState([...relaysOnPlatform]);
  const topicSuggestions = useMemo(() => {
    return getSuggestions(tempTag);
  }, [tempTag]);

  const handleImageUpload = (file) => {
    if (file && !file.type.includes("image/")) {
      setToast({
        type: 2,
        desc: "Image type is unsupported!",
      });
      return;
    }
    if (file) {
      setThumbnail(file);
      setThumbnailPrev(URL.createObjectURL(file));
      setThumbnailUrl("");
    }
  };

  const initThumbnail = async () => {
    setThumbnail("");
    setThumbnailPrev("");
    setThumbnailUrl("");
  };

  const Submit = async () => {
    try {
      setIsLoading(true);
      let tags_ = Array.from(tags);
      if (zapSplit) tags_ = [...tags_, ...zapSplit];
      for (let cat of selectedCategories) {
        tags_.push(["t", cat]);
      }
      tags_.push(["thumb", thumbnailUrl]);
      tags_.push(["image", thumbnailUrl]);
      tags_.push( [
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ]);

      setToPublish({
        nostrKeys: nostrKeys,
        kind: 34235,
        content: title,
        tags: tags_,
        allRelays: relaysToPublish,
      });

      exit();
      return;
    } catch (err) {
      setToast({
        type: 2,
        desc: "An error has occurred!",
      });
      setIsLoading(false);
    }
  };
  const removeCategory = (cat) => {
    let index = selectedCategories.findIndex((item) => item === cat);
    let tempArray = Array.from(selectedCategories);
    tempArray.splice(index, 1);
    setSelectedCategories(tempArray);
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

  const handleThumbnailValue = (e) => {
    let value = e.target.value;
    setThumbnailUrl(value);
    setThumbnailPrev(value);
    setThumbnail("");
  };

  const handleAddZapSplit = (pubkey, action) => {
    if (action === "add") {
      let findPubkey = zapSplit.find((item) => item[1] === pubkey);
      if (!findPubkey)
        setZapSplit((prev) => [...prev, ["zap", pubkey, "", "1"]]);
    }
    if (action === "remove") {
      let findPubkeyIndex = zapSplit.findIndex((item) => item[1] === pubkey);
      if (findPubkeyIndex !== -1) {
        let tempZapSplit = Array.from(zapSplit);
        tempZapSplit.splice(findPubkeyIndex, 1);
        setZapSplit(tempZapSplit);
      }
    }
  };

  const handleZapAmount = (amount, pubkey) => {
    let findPubkeyIndex = zapSplit.findIndex((item) => item[1] === pubkey);
    if (findPubkeyIndex !== -1) {
      let tempZapSplit = Array.from(zapSplit);
      tempZapSplit[findPubkeyIndex][3] = `${amount}`;
      setZapSplit(tempZapSplit);
    }
  };
  const calculatePercentage = (amount) => {
    let allAmount =
      zapSplit.reduce((total, item) => (total += parseInt(item[3])), 0) || 1;
    return Math.floor((amount * 100) / allAmount);
  };
  return (
    <section className="fixed-container fx-centered" style={{ zIndex: 10000 }}>
      {screen === 1 && (
        <div
          className="fx-centered fx-col slide-down box-pad-h"
          style={{
            flex: "1 1 500px",
            maxWidth: "500px",
          }}
        >
          <div className="fx-centered fx-start-h fit-container pointer" onClick={isLoading ? null :exit}>
            <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
            {isLoading ? <LoadingDots /> : <p className="gray-c">back</p>}
          </div>

          <div className=" fx-centered fx-start-v fx-stretch fit-container">
            <div className="fx-centered fx-col fit-container">
              <div
                className="fit-container fx-centered fx-col sc-s box-pad-h bg-img cover-bg"
                style={{
                  position: "relative",
                  height: "200px",
                  backgroundImage: `url(${thumbnailPrev})`,
                  backgroundColor: "var(--dim-gray)",
                }}
              >
                {thumbnailPrev && (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      position: "absolute",
                      right: "16px",
                      top: "16px",
                      backgroundColor: "var(--dim-gray)",
                      borderRadius: "var(--border-r-50)",
                      zIndex: 10,
                    }}
                    className="fx-centered pointer"
                    onClick={initThumbnail}
                  >
                    <div className="trash"></div>
                  </div>
                )}

                {!thumbnailPrev && (
                  <>
                    <p className="gray-c p-medium">(thumbnail preview)</p>
                  </>
                )}
              </div>
              <div className="fit-container fx-centered">
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder="Image url..."
                  value={thumbnailUrl}
                  onChange={handleThumbnailValue}
                  disabled={isLoading}
                />
                <UploadFile
                  round={true}
                  setFileMetadata={handleImageUpload}
                  setImageURL={setThumbnailUrl}
                  setIsUploadsLoading={setIsLoading}
                />
              </div>
              <div style={{ position: "relative" }} className="fit-container">
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
                          onClick={(e) => {
                            item.replace(/\s/g, "").length
                              ? setSelectedCategories([
                                  ...selectedCategories,
                                  item.trim(),
                                ])
                              : setToast({
                                  type: 3,
                                  desc: "Your tag contains only spaces!",
                                });

                            setTempTag("");
                            e.stopPropagation();
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                )}
                <form
                  className="fit-container fx-scattered"
                  onSubmit={(e) => {
                    e.preventDefault();
                    tempTag.replace(/\s/g, "").length
                      ? setSelectedCategories([
                          ...selectedCategories,
                          tempTag.trim(),
                        ])
                      : setToast({
                          type: 3,
                          desc: "Your tag contains only spaces!",
                        });
                    setTempTag("");
                  }}
                  style={{ position: "relative" }}
                >
                  <input
                    type="text"
                    className="if ifs-full"
                    placeholder="keyword (optional)"
                    value={tempTag}
                    onChange={(e) => setTempTag(e.target.value)}
                    disabled={isLoading}
                  />
                  {tempTag && (
                    <button
                      className="btn btn-normal"
                      style={{ minWidth: "max-content" }}
                      disabled={isLoading}
                    >
                      Add tag
                    </button>
                  )}
                </form>
              </div>
              {selectedCategories.length > 0 && (
                <div className="fit-container box-pad-v-m fx-centered fx-col fx-start-h">
                  <p className="p-medium gray-c fit-container p-left">
                    Selected categories
                  </p>
                  <div className="fit-container  fx-scattered fx-wrap fx-start-h">
                    {selectedCategories.map((item, index) => {
                      return (
                        <div
                          key={`${item}-${index}`}
                          className="sticker sticker-gray-c1"
                          style={{ columnGap: "8px" }}
                        >
                          <span>{item}</span>
                          <p
                            className="p-medium pointer"
                            onClick={() => removeCategory(item)}
                          >
                            &#10005;
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button
                className="btn btn-normal fx-centered"
                onClick={() => setScreen(2)}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : "Next"}
                <div className="arrow" style={{ filter: "invert()" }}></div>
              </button>
            </div>
          </div>
        </div>
      )}
      {screen === 2 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h"
          style={{
            width: "500px",
          }}
        >
          <button
            className="btn btn-normal fx-centered box-marg-s"
            onClick={() => setScreen(1)}
            disabled={isLoading}
          >
            Previous{" "}
            <div
              className="arrow"
              style={{ filter: "invert()", transform: "rotate(-180deg)" }}
            ></div>
          </button>
          <div className="box-pad-v-s"> </div>
          <div
            className="fx-scattered fit-container pointer"
            onClick={() => setFinalStepContent(finalStepContent !== 0 ? 0 : 1)}
          >
            <h4 className="p-centered">Choose relays</h4>
            <div className="arrow"></div>
          </div>
          {finalStepContent === 1 && (
            <>
              <div className="fit-container">
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
                    if (index < 2)
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
            </>
          )}

          <div className="fit-container box-pad-v-m">
            <hr />
            <hr />
          </div>
          <div
            className="fx-scattered fit-container pointer"
            onClick={() => setFinalStepContent(finalStepContent !== 0 ? 0 : 2)}
          >
            <h4 className="p-centered">Revenues split</h4>
            <div className="arrow"></div>
          </div>
          {finalStepContent === 2 && (
            <>
              <div className="box-pad-v-s"> </div>
              <label
                htmlFor="zap-split"
                className="if ifs-full fx-centered fx-start-h"
                style={{
                  borderColor: zapSplitEnabled ? "var(--blue-main)" : "",
                }}
              >
                <input
                  type="checkbox"
                  id="zap-split"
                  checked={zapSplitEnabled}
                  onChange={() =>
                    !isLoading && setZapSplitEnabled(!zapSplitEnabled)
                  }
                />
                <p className={zapSplitEnabled ? "" : "gray-c"}>
                  I want to share this article's revenues
                </p>
              </label>
              {zapSplitEnabled && (
                <>
                  <UserSearchBar
                    onClick={(pubkey) => handleAddZapSplit(pubkey, "add")}
                  />
                  <div
                    className="fit-container fx-wrap fx-centered"
                    style={{ maxHeight: "30vh", overflow: "scroll" }}
                  >
                    {zapSplit.map((item, index) => {
                      const percentage = calculatePercentage(item[3]) || 0;
                      return (
                        <div
                          className="fit-container fx-scattered fx-stretch"
                          key={item[1]}
                        >
                          <NProfilePreviewer
                            pubkey={item[1]}
                            margin={false}
                            close={true}
                            onClose={() =>
                              zapSplit.length > 1 &&
                              handleAddZapSplit(item[1], "remove")
                            }
                          />
                          <div
                            style={{ width: "35%" }}
                            className="sc-s-18 fx-centered fx-col fx-start-v"
                          >
                            <div
                              style={{
                                position: "relative",
                              }}
                            >
                              <input
                                type="number"
                                className="if ifs-full if-no-border"
                                placeholder="portion"
                                value={item[3]}
                                max={100}
                                style={{ height: "100%" }}
                                onChange={(e) =>
                                  handleZapAmount(e.target.value, item[1])
                                }
                              />
                            </div>
                            <hr />
                            <p className="orange-c p-medium box-pad-h-m">
                              {percentage}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
          <div className="box-pad-v-m"> </div>

          <button
            className="btn btn-full  btn-normal"
            onClick={() => !isLoading && Submit(30023)}
          >
            {isLoading ? <LoadingDots /> : "Publish"}
          </button>
        </div>
      )}
      {screen === 3 && (
        <div
          className="fx-centered fx-col slide-up box-pad-h"
          style={{
            width: "500px",
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
          <div className="box-pad-v-s fx-centered">
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
