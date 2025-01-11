import React, { useContext, useState } from "react";
import LoadingDots from "../LoadingDots";
import { deleteFromS3, uploadToS3 } from "../../Helpers/NostrPublisher";
import { Context } from "../../Context/Context";
import { nanoid } from "nanoid";
import PublishRelaysPicker from "./PublishRelaysPicker";

export default function AddCurationNOSTR({
  curation,
  exit,
  relaysToPublish,
  mandatoryKind = false,
  tags = [],
}) {
  const { nostrKeys, setToast, setToPublish } = useContext(Context);
  const [title, setTitle] = useState(curation?.title || "");
  const [excerpt, setExcerpt] = useState(curation?.description || "");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPrev, setThumbnailPrev] = useState(curation?.image || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(curation?.image || "");
  const [isLoading, setIsLoading] = useState(false);
  const [kind, setKind] = useState(curation?.kind || mandatoryKind || 30004);

  const [showRelaysPicker, setShowRelaysPicker] = useState(false);

  const handleFileUplaod = (e) => {
    let file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPrev(URL.createObjectURL(file));
      setThumbnailUrl("");
    }
  };
  const handleDataUpload = async (selectedRelays) => {
    try {
      setIsLoading(true);

      if (!selectedRelays || !selectedRelays.length) {
        setIsLoading(false);
        setToast({
          type: 3,
          desc: "No relay was selected!",
        });
        return;
      }

      if (curation?.thumbnail && thumbnail) deleteFromS3(curation?.thumbnail);
      let cover = thumbnail
        ? await uploadToS3(thumbnail, nostrKeys.pub)
        : thumbnailUrl;
      let tempTags = getTags(title, excerpt, cover);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: curation?.kind || kind,
        content: "",
        tags: tempTags,
        allRelays: selectedRelays,
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
  const initThumbnail = async () => {
    setThumbnail("");
    setThumbnailPrev("");
    setThumbnailUrl("");
  };

  const handleThumbnailValue = (e) => {
    let value = e.target.value;
    setThumbnailUrl(value);
    setThumbnailPrev(value);
    setThumbnail("");
  };
  const confirmPublishing = (relays) => {
    handleDataUpload(relays);
    setShowRelaysPicker(false);
  };

  const handleShowRelaysPicker = () => {
    if (!thumbnail && !thumbnailPrev) {
      setIsLoading(false);
      setToast({
        type: 3,
        desc: "Missing thumbnail image",
      });
      return;
    }
    if (!title) {
      setIsLoading(false);
      setToast({
        type: 3,
        desc: "Missing title",
      });
      return;
    }
    if (!excerpt) {
      setIsLoading(false);
      setToast({
        type: 3,
        desc: "Missing description",
      });
      return;
    }
    setShowRelaysPicker(true);
  };

  return (
    <section
      className="fixed-container fx-centered box-pad-h"
      style={{ zIndex: "10001" }}
    >
      {showRelaysPicker && (
        <PublishRelaysPicker
          confirmPublishing={confirmPublishing}
          exit={() => setShowRelaysPicker(false)}
          button={curation ? "update curation" : "add curation"}
        />
      )}
      <section
        className="fx-centered fx-col sc-s"
        style={{ width: "600px", rowGap: 0 }}
      >
        <div className="fit-container fx-scattered box-pad-h box-pad-v">
          <div className="fx-centered pointer" onClick={exit}>
            <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
            <p className="gray-c">back</p>
          </div>
          <h4>{curation ? "Update curation" : "Add curation"}</h4>
        </div>
        <hr />
        <div className="fit-container fx-centered fx-col">
          <div
            className="fit-container fx-centered  bg-img cover-bg"
            style={{
              position: "relative",

              height: "200px",
              borderRadius: "0",
              backgroundImage: `url(${thumbnailPrev})`,
              backgroundColor: "var(--dim-gray)",
            }}
          >
            {!thumbnailPrev && (
              <div className="fx-col fx-centered">
                <p className="p-medium gray-c">(thumbnail preview)</p>
              </div>
            )}
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
          </div>
          <div className="fx-centered fx-wrap fit-container box-pad-v box-pad-h">
            <div className="fit-container fx-centered">
              <input
                type="text"
                className="if ifs-full"
                placeholder="Image url..."
                value={thumbnailUrl}
                onChange={handleThumbnailValue}
              />
              <label
                htmlFor="image-up"
                className="fit-container fx-centered fx-col box-pad-h sc-s pointer bg-img cover-bg"
                style={{
                  position: "relative",
                  minHeight: "50px",
                  minWidth: "50px",
                  maxWidth: "50px",
                }}
              >
                <div className="upload-file-24"></div>
                <input
                  type="file"
                  id="image-up"
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    left: 0,
                    top: 0,
                    opacity: 0,
                  }}
                  value={thumbnail.fileName}
                  onChange={handleFileUplaod}
                  className="pointer"
                  accept="image/jpg,image/png,image/gif"
                />
              </label>
            </div>
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
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              style={{ height: "100px", paddingTop: "1rem" }}
            />
            <div
              className={`fx-scattered  if ifs-full ${
                mandatoryKind ? "if-disabled" : ""
              }`}
            >
              {kind === 30004 && (
                <p className="p-medium green-c slide-left">Articles curation</p>
              )}
              {kind === 30005 && (
                <p className="p-medium orange-c slide-right">Videos curation</p>
              )}
              <div
                className={`toggle ${kind === 30005 ? "toggle-orange" : ""} ${
                  kind === 30004 ? "toggle-green" : ""
                }`}
                onClick={() => {
                  if (!mandatoryKind) {
                    kind === 30004 ? setKind(30005) : setKind(30004);
                  }
                }}
              ></div>
            </div>
          </div>
        </div>
        <hr />
        {!curation && (
          <div className="box-pad-v-m">
            <button className="btn btn-normal" onClick={handleShowRelaysPicker}>
              {isLoading ? <LoadingDots /> : <>Next</>}
            </button>
          </div>
        )}
        {curation && (
          <div className="box-pad-v-m fx-centered">
            <button
              className="btn btn-normal"
              onClick={() => handleDataUpload(relaysToPublish)}
            >
              {isLoading ? <LoadingDots /> : <>Update in same relays</>}
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
