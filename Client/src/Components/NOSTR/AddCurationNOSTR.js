import React, { useContext, useState } from "react";
import LoadingDots from "../LoadingDots";
import {
  deleteFromS3,
  publishPost,
  uploadToS3,
} from "../../Helpers/NostrPublisher";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import { nanoid } from "nanoid";

export default function AddCurationNOSTR({
  curation,
  exit,
  exitAndRefresh,
  tags = [],
}) {
  const { nostrKeys, setToast } = useContext(Context);
  const [title, setTitle] = useState(curation?.title || "");
  const [excerpt, setExcerpt] = useState(curation?.excerpt || "");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPrev, setThumbnailPrev] = useState(curation?.thumbnail || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(curation?.thumbnail || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUplaod = (e) => {
    let file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPrev(URL.createObjectURL(file));
      setThumbnailUrl("");
    }
  };

  const handleDataUpload = async () => {
    try {
      setIsLoading(true);
      if (curation?.thumbnail && thumbnail) deleteFromS3(curation?.thumbnail);
      let cover = thumbnail
        ? await uploadToS3(thumbnail, nostrKeys.pub)
        : thumbnailUrl;
      if (cover) {
        let tempTags = getTags(title, excerpt, cover);
        let publish = await publishPost(nostrKeys, 30001, "", tempTags, [
          relaysOnPlatform[0],
        ]);
        setIsLoading(false);
        if (!publish) {
          setToast({
            type: 2,
            desc: "Publishing was cancelled!",
          });
          return;
        }
        if (publish.find((item) => item.status)) {
          setToast({
            type: 1,
            desc: "Your curation has been successfully posted on Nostr.",
          });
          exitAndRefresh();
          return;
        }
        setToast({
          type: 2,
          desc: "An error has occurred",
        });
      } else {
        setIsLoading(false);
        setToast({
          type: 2,
          desc: "An error has occurred!",
        });
      }
    } catch (err) {
      console.log(err);

      setToast({
        type: 2,
        desc: "An error has occurred!",
      });
    }
  };

  // const getTags = () => {
  //   let tempTags = Array.from(tags);
  //   let checkStatus = false;
  //   for (let tag of tempTags) {
  //     if (tag[0] === "d") {
  //       checkStatus = true;
  //     }
  //   }
  //   if (!checkStatus) {
  //     tempTags.push(["d", nanoid()]);
  //     return tempTags;
  //   }
  //   return tempTags;
  // };

  const getTags = (title, excerpt, thumbnail) => {
    let tempTags = Array.from(tags);
    let checkStatus = false;

    for (let tag of tempTags) {
      if (tag[0] === "d") {
        checkStatus = true;
      }
    }
    if (!checkStatus) {
      tempTags.push(["d", nanoid()]);
      tempTags.push(["c", "curation"]);
      tempTags.push(["title", title]);
      tempTags.push(["excerpt", excerpt]);
      tempTags.push(["thumbnail", thumbnail]);
      return tempTags;
    }

    for (let i = 0; i < tempTags.length; i++) {
      if (tempTags[i][0] === "title") {
        tempTags[i][1] = title;
      }
      if (tempTags[i][0] === "excerpt") {
        tempTags[i][1] = excerpt;
      }
      if (tempTags[i][0] === "thumbnail") {
        tempTags[i][1] = thumbnail;
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
  return (
    <section className="fixed-container fx-centered box-pad-h">
      <section
        className="fx-centered fx-col sc-s"
        style={{ width: "600px", rowGap: 0 }}
      >
        <div className="fit-container fx-scattered box-pad-h box-pad-v">
          <div className="fx-centered pointer" onClick={exit}>
            <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
            <p className="gray-c">back</p>
          </div>
          <h4>Add curation</h4>
        </div>
        <hr />
        <div
          className="fit-container fx-centered fx-col"
          //   style={{ rowGap: "32px" }}
        >
          <div
            // htmlFor="file-input"
            className="fit-container fx-centered  bg-img cover-bg"
            style={{
              position: "relative",

              height: "200px",
              borderRadius: "0",
              backgroundImage: `url(${thumbnailPrev})`,
              backgroundColor: "var(--dim-gray)",
              // border: thumbnailPrev ? "none" : "1px dashed var(--pale-gray)",
            }}
          >
            {!thumbnailPrev && (
              <div className="fx-col fx-centered">
                {/* <div className="image-24"></div> */}
                <p className="p-medium gray-c">(thumbnail preview)</p>
              </div>
            )}{" "}
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
            {/* <input
              type="file"
              id="file-input"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                zIndex: "-1",
              }}
              onChange={handleFileUplaod}
            /> */}
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
                  // disabled={thumbnail}
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
          </div>
        </div>
        <hr />
        <div className="box-pad-v-m">
          <button className="btn btn-normal" onClick={handleDataUpload}>
            {isLoading ? (
              <LoadingDots />
            ) : (
              <>{curation ? "update curation" : "add curation"}</>
            )}
          </button>
        </div>
      </section>
    </section>
  );
}
