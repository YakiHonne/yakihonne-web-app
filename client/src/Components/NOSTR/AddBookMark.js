import React, { useContext, useState } from "react";
import LoadingDots from "../LoadingDots";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import { nanoid } from "nanoid";
import { filterRelays } from "../../Helpers/Encryptions";

export default function AddBookmark({ bookmark, exit, tags = [] }) {
  const { nostrKeys, setToast, setToPublish, nostrUser } = useContext(Context);
  const [title, setTitle] = useState(bookmark?.title || "");
  const [description, setDescription] = useState(bookmark?.description || "");
  const [image, setImage] = useState(bookmark?.image || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleDataUpload = () => {
    try {
      setIsLoading(true);
      let tempTags = getTags(title, description, image);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 30003,
        content: "",
        tags: tempTags,
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });
      setIsLoading(false);
      exit();
    } catch (err) {
      console.log(err);
      setToast({
        type: 2,
        desc: "An error has occurred!",
      });
    }
  };

  const getTags = (title, description, image) => {
    let tempTags = Array.from(tags);
    let checkStatus = false;
    for (let tag of tempTags) {
      if (tag[0] === "d") {
        checkStatus = true;
      }
    }
    if (!checkStatus) {
      tempTags.push([
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ]);
      tempTags.push(["published_at", `${Math.floor(Date.now() / 1000)}`]);
      tempTags.push(["d", nanoid()]);
      tempTags.push(["title", title]);
      tempTags.push(["description", description]);
      tempTags.push(["image", image]);
      return tempTags;
    }
    for (let i = 0; i < tempTags.length; i++) {
      if (tempTags[i][0] === "title") {
        tempTags[i][1] = title;
      }
      if (tempTags[i][0] === "description") {
        tempTags[i][1] = description;
      }
      if (tempTags[i][0] === "image") {
        tempTags[i][1] = image;
      }
    }
    return tempTags;
  };

  const handleShowRelaysPicker = () => {
    if (!title) {
      setIsLoading(false);
      setToast({
        type: 3,
        desc: "Missing title",
      });
      return;
    }
    handleDataUpload();
  };

  return (
    <section
      className="fixed-container fx-centered box-pad-h"
      style={{ zIndex: "10001" }}
    >
      <section
        className="fx-centered fx-col sc-s"
        style={{ width: "600px", rowGap: 0 }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="fit-container fx-centered box-pad-h box-pad-v">
          <h4>{bookmark ? <>Update bookmark</> : <>Add new bookmark</>}</h4>
        </div>
        <div className="fit-container fx-centered fx-col">
          <div className="fx-centered fx-wrap fit-container box-pad-v box-pad-h">
            <input
              type="text"
              className="if ifs-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              type="text"
              className="if ifs-full"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ height: "100px", paddingTop: "1rem" }}
            />
          </div>
        </div>
        <hr />
        <div className="box-pad-v-m">
          <button className="btn btn-normal" onClick={handleShowRelaysPicker}>
            {isLoading ? (
              <LoadingDots />
            ) : bookmark ? (
              <>Update bookmark</>
            ) : (
              <>Create bookmark</>
            )}
          </button>
        </div>
      </section>
    </section>
  );
}
