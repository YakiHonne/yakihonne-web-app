import React, { useContext, useState } from "react";
import { Context } from "../../Context/Context";
import { finalizeEvent, nip19, SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import { filterRelays } from "../../Helpers/Encryptions";
import LoadingDots from "../LoadingDots";

export default function AddPoll({ exit, setNevent }) {
  const { nostrUser, nostrKeys, setToast, setToPublish } = useContext(Context);
  const [content, setContent] = useState("");
  const [options, setOptions] = useState([]);
  const [tempOption, setTempOption] = useState("");
  const [minSats, setMinSats] = useState("");
  const [maxSats, setMaxSats] = useState("");
  const [closedAt, setClosedAt] = useState("");

  const handleChange = (e) => {
    let value = e.target.value;
    let element = e.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;

    setContent(value);
    if (!value || value === "\n") {
      setContent("");
      return;
    }
  };

  const handleAddOption = () => {
    if (!tempOption) return;
    setOptions((prev) => [...prev, tempOption]);
    setTempOption("");
  };
  const handleEditOption = (value, index) => {
    let tempArray = Array.from(options);
    tempArray[index] = value;
    setOptions(tempArray);
  };
  const handleDeleteOption = (index) => {
    let tempArray = Array.from(options);
    tempArray.splice(index, 1);
    setOptions(tempArray);
  };
  const postPoll = async () => {
    let created_at = Math.floor(Date.now() / 1000);
    let closed_at = closedAt
      ? Math.floor(new Date(closedAt).getTime() / 1000)
      : false;
    let tempOptions = options.filter((option) => option);
    let relaysToPublish = nostrUser
      ? filterRelays(relaysOnPlatform, nostrUser?.relays || [])
      : relaysOnPlatform;
    if (!content) {
      setToast({
        type: 3,
        desc: "The content must not stay empty",
      });
      return;
    }
    if (tempOptions.length <= 1) {
      setToast({
        type: 3,
        desc: "The poll should have at least two options.",
      });
      return;
    }
    if (closed_at && closed_at <= created_at) {
      setToast({
        type: 3,
        desc: "The poll closing time must be greater than the current time",
      });
      return;
    }
    if (minSats !== "" && maxSats !== "" && minSats > maxSats) {
      setToast({
        type: 3,
        desc: "The maximum satoshi must be greater than the minimum satochi",
      });
      return;
    }
    let tags = options.map((option, index) => [
      "poll_option",
      `${index}`,
      option,
    ]);
    tags.push(["p", nostrKeys.pub]);
    tags.push([
      "client",
      "Yakihonne",
      "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
    ]);

    if (closed_at) tags.push(["closed_at", `${closed_at}`]);
    if (minSats !== "") tags.push(["value_minimum", `${minSats}`]);
    if (maxSats !== "") tags.push(["value_maximum", `${maxSats}`]);
    let tempEvent = {
      created_at,
      kind: 6969,
      content: content,
      tags,
    };
    if (nostrKeys.ext) {
      try {
        tempEvent = await window.nostr.signEvent(tempEvent);
      } catch (err) {
        console.log(err);
        return false;
      }
    } else {
      tempEvent = finalizeEvent(tempEvent, nostrKeys.sec);
    }
    setToPublish({
      eventInitEx: tempEvent,
      allRelays: relaysToPublish,
    });
    let nEvent = nip19.neventEncode({
      id: tempEvent.id,
      pubkey: nostrKeys.pub,
    });
    let pool = new SimplePool();
    let sub = pool.subscribeMany(
      relaysToPublish,
      [{ kinds: [6969], ids: [tempEvent.id] }],
      {
        onevent() {
          setToast({
            type: 1,
            desc: "Poll was posted successfully",
          });
          setNevent(nEvent);
          sub.close();
        },
      }
    );
  };
  return (
    <div className="fixed-container box-pad-h fx-centered">
      <div
        className="sc-s-18 box-pad-h-m box-pad-v-m fx-centered fx-col"
        style={{
          width: "min(100%, 500px)",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <h4 className="box-marg-s">Add poll</h4>
        <textarea
          className="txt-area fit-container"
          onChange={handleChange}
          value={content}
          placeholder="Description"
        />
        <input
          type="number"
          className="if ifs-full"
          placeholder="Minimum Satoshi (optional)"
          value={minSats}
          onChange={(e) => {
            setMinSats(parseInt(e.target.value) || "");
          }}
        />
        <input
          type="number"
          className="if ifs-full"
          placeholder="Maximum Satoshi (optional)"
          value={maxSats}
          onChange={(e) => setMaxSats(parseInt(e.target.value) || "")}
        />
        <input
          type="datetime-local"
          className="if ifs-full pointer"
          placeholder="Poll close date"
          value={closedAt}
          min={new Date().toISOString()}
          onChange={(e) => {
            setClosedAt(e.target.value);
          }}
        />
        <div className="fit-container fx-centered fx-col fx-start-v">
          <p className="p-medium gray-c">Options</p>
          {options.map((option, index) => {
            return (
              <div className="fit-container fx-centered" key={index}>
                <input
                  type="text"
                  className="if ifs-full"
                  placeholder="Option"
                  value={option}
                  onChange={(e) => handleEditOption(e.target.value, index)}
                />
                <div
                  className="round-icon round-icon-tooltip"
                  data-tooltip="Delete option"
                  onClick={() => handleDeleteOption(index)}
                >
                  <div className="trash"></div>
                </div>
              </div>
            );
          })}
          <div className="fit-container fx-scattered">
            <input
              type="text"
              className="if ifs-full"
              placeholder="Add option"
              value={tempOption}
              onChange={(e) => setTempOption(e.target.value)}
            />
            <div
              className={`round-icon round-icon-tooltip ${
                tempOption ? "pointer" : "if-disabled"
              }`}
              data-tooltip="Add option"
              onClick={handleAddOption}
            >
              <div className="plus-sign" style={{ cursor: "unset" }}></div>
            </div>
          </div>
          <button className="btn btn-normal btn-full" onClick={postPoll}>
            Post poll
          </button>
        </div>
      </div>
    </div>
  );
}
