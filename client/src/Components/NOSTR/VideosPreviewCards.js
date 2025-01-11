import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Date_ from "../Date_";
import { Context } from "../../Context/Context";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { getBech32 } from "../../Helpers/Encryptions";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import ShareLink from "../ShareLink";
import MediaPreview from "./MediaPreview";

const checkFollowing = (list, toFollowKey) => {
  if (!list) return false;
  return list.find((people) => people[1] === toFollowKey) ? true : false;
};

export default function VideosPreviewCards({ item, duration = true }) {
  const { userFollowings, nostrAuthors, getNostrAuthor } = useContext(Context);
  const optionsRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [author, setAuthor] = useState({
    pubkey: item.pubkey,
    display_name: getBech32("npub", item.pubkey).substring(0, 10),
    name: getBech32("npub", item.pubkey).substring(0, 10),
    picture: "",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const isFollowing = useMemo(() => {
    return checkFollowing(userFollowings, item.pubkey);
  }, [userFollowings]);
  
  useEffect(() => {
    if (!isLoaded) {
      let auth = getNostrAuthor(item.pubkey);
      if (auth) {
        setAuthor(auth);
        setIsLoaded(true);
      }
    }
  }, [nostrAuthors]);

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
    <>
      {showPreview && (
        <MediaPreview
          kind={"video"}
          exit={() => setShowPreview(false)}
          data={{ author, content: item }}
        />
      )}

      <div
        key={item.id}
        className="sc-s-18  fit-container  box-pad-h-m mediacard"
        style={{
          position: "relative",
          overflow: "visible",
          columnGap: "16px",
          border: "none",
        }}
      >
        <div className="fit-container fx-scattered  box-pad-v-m">
          <div
            className="fx-scattered fx-wrap fit-container"
            style={{ rowGap: "8px" }}
          >
            <div className="fx-centered">
              <AuthorPreview author={author} />
              {isFollowing && (
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Following"
                >
                  <div className="user-followed"></div>
                </div>
              )}
            </div>

            <p className="gray-c p-medium">
              <Date_
                toConvert={new Date(item.published_at * 1000)}
                time={true}
              />
            </p>
          </div>
        </div>
        <Link
          className="fit-container fx-scattered "
          style={{ columnGap: "16px" }}
          to={`/videos/${item.naddr}`}
        >
          <div
            className="fx-centered fx-col fx-start-v"
            style={{ width: "max(70%, 800px)" }}
          >
            <p className="p-two-lines p-bold p-big">{item.title}</p>
            <p className="p-two-lines gray-c p-medium">{item.content}</p>
          </div>
          <div
            className="sc-s-18 fx-centered bg-img cover-bg fit-container fx-centered fx-end-h fx-end-v"
            style={{
              aspectRatio: "16/9",
              width: "max(30%,400px)",
              backgroundImage: `url(${item.image})`,
              backgroundColor: "black",
              border: "none",
            }}
          >
            <div
              className="fit-container fx-centered fx-col box-pad-h-s fx-start-v fx-end-h box-pad-v-s"
              style={{
                height: "100%",
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 87%)",
                position: "relative",
              }}
            >
              <div
                className="fx-centered"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <div className="play-vid-58"></div>
              </div>

              <div
                className="fit-container mb-hide-800"
                style={{ justifyContent: "flex-end", alignItems: "flex-end" }}
              >
                <div
                  className="sticker sticker-normal"
                  style={{
                    backgroundColor: "black",
                    color: "white",
                  }}
                >
                  {item.duration}
                </div>
              </div>
            </div>
          </div>
        </Link>
        <div className="fit-container fx-scattered box-pad-v-m">
          <div className="fx-centered">
            <div
              className="round-icon-small round-icon-tooltip slide-left preview-icon "
              data-tooltip="Quick look"
              onClick={() => setShowPreview(!showPreview)}
            >
              <div className="eye-opened"></div>
            </div>
            <div
              className="round-icon-small round-icon-tooltip"
              data-tooltip="Video"
            >
              <div className="play"></div>
            </div>
            {item.keywords.length > 0 && (
              <div className="fit-container fx-scattered ">
                <div
                  className="fx-centered fx-start-h no-scrollbar"
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="fx-centered fx-start-h no-scrollbar"
                    style={{
                      transition: ".3s ease-in-out",
                    }}
                  >
                    {item.keywords.slice(0, 3).map((tag, index) => {
                      if (!tag) return;
                      return (
                        <Link
                          key={`${tag}-${index}`}
                          style={{
                            textDecoration: "none",
                            color: "var(--gray)",
                          }}
                          className="sticker sticker-small sticker-gray-gray fx-shrink"
                          to={`/tags/${tag.replace("#", "%23")}`}
                          target={"_blank"}
                        >
                          {tag}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
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
                  // transform: "translateY(100%)",
                  minWidth: "200px",
                  width: "max-content",
                  zIndex: 1000,
                  rowGap: "12px",
                }}
                className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
              >
                <SaveArticleAsBookmark
                  label="Bookmark video"
                  pubkey={item.pubkey}
                  kind={item.kind}
                  d={item.d}
                  image={item.image}
                />
                <div className="fit-container fx-centered fx-start-h pointer">
                  <ShareLink
                    label="Share video"
                    path={`/videos/${item.naddr}`}
                    title={item.title}
                    description={item.title}
                    kind={30023}
                    shareImgData={{
                      post: item,
                      author,
                      label: "Video",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const AuthorPreview = ({ author }) => {
  return (
    <div className="fx-centered fx-start-h ">
      <UserProfilePicNOSTR
        size={40}
        mainAccountUser={false}
        ring={false}
        user_id={author.pubkey}
        img={author.picture}
        metadata={author}
      />
      <div>
        <p className="p-bold">{author.display_name || author.name}</p>
        <p className="p-medium gray-c">@{author.name || author.display_name}</p>
      </div>
    </div>
  );
};
