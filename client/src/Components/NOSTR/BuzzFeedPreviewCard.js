import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Date_ from "../Date_";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import ShareLink from "../ShareLink";

export default function BuzzFeedPreviewCard({ item }) {
  const optionsRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const handleOffClick = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target))
        setShowOptions(false);
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [optionsRef]);

  return (
    <div
      className={"fit-container fx-scattered sc-s-18 box-pad-h-m"}
      onClick={(e) => e.stopPropagation()}
      style={{
        border: "none",
        position: "relative",
        overflow: "visible",
        columnGap: "16px",
      }}
    >
      <div className="fit-container pointer">
        <div className="fit-container fx-scattered box-pad-v-m">
          <div className=" fx-centered">
            <a
              className="fx-centered"
              href={item.source_domain}
              target="_blank"
            >
              <div
                style={{
                  minWidth: "40px",
                  minHeight: "40px",
                  borderRadius: "var(--border-r-50)",
                  backgroundImage: `url(${item.source_icon})`,
                }}
                className="bg-img cover-bg"
              ></div>
              <div>
                <p className="p-bold">{item.source_name}</p>
                <p className="p-medium gray-c">
                  {item.source_domain.split("//")[1]}
                </p>
              </div>
            </a>
          </div>
          <p className="p-medium gray-c left-p">
            <Date_ toConvert={new Date(item.published_at * 1000)} time={true} />
          </p>
        </div>
        <Link
          className="fit-container fx-scattered"
          style={{ columnGap: "16px" }}
          to={`/buzz-feed/${item.nEvent}`}
        >
          <div style={{ width: "max(70%, 800px)" }}>
            <p className="left-p p-big p-bold">{item.title}</p>
          </div>
          <div
            className=" bg-img cover-bg sc-s-18 "
            style={{
              backgroundImage: `url(${item.image})`,
              width: "max(30%,400px)",
              aspectRatio: "16/9",
              border: "none",
            }}
          ></div>
        </Link>
        <div className="fit-container fx-scattered box-pad-v-m">
          <div className="fx-centered">
            <div
              className="round-icon-small round-icon-tooltip"
              data-tooltip="Buzz feed"
            >
              <div className="buzz"></div>
            </div>
          </div>
          <div style={{ position: "relative" }} ref={optionsRef}>
            <div
              className="round-icon-small round-icon-tooltip"
              style={{ border: "none" }}
              data-tooltip="Options"
              onClick={() => {
                setShowOptions(!showOptions);
              }}
            >
              <div className="fx-centered fx-col" style={{ rowGap: 0 }}>
                <p className="gray-c fx-centered" style={{ height: "6px" }}>
                  &#x2022;
                </p>
                <p className="gray-c fx-centered" style={{ height: "6px" }}>
                  &#x2022;
                </p>
                <p className="gray-c fx-centered" style={{ height: "6px" }}>
                  &#x2022;
                </p>
              </div>
            </div>
            {showOptions && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "110%",
                  backgroundColor: "var(--dim-gray)",
                  border: "none",
                  minWidth: "200px",
                  width: "max-content",
                  zIndex: 1000,
                  rowGap: "12px",
                }}
                className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
              >
                <a href={item.source_url} target="_blank">
                  Go to source
                </a>
                <SaveArticleAsBookmark
                  label="Bookmark article"
                  pubkey={item.id}
                  itemType="e"
                  kind="1"
                />
                <div className="fit-container fx-centered fx-start-h pointer">
                  <ShareLink
                    label="Share buzz feed"
                    path={`/buzz-feed/${item.nEvent}`}
                    title={item.source_name}
                    description={item.content}
                    kind={1}
                    shareImgData={{
                      post: {
                        content: item.title,
                        description: item.description,
                        image: item.image,
                        created_at: item.published_at,
                      },
                      author: {
                        display_name: item.source_name,
                        picture: item.source_icon,
                      },
                      label: "Buzz feed",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
