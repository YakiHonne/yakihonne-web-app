import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Date_ from "../Date_";
import { Context } from "../../Context/Context";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import { getEmptyNostrUser } from "../../Helpers/Encryptions";
import ShareLink from "../ShareLink";
import MediaPreview from "./MediaPreview";

const checkFollowing = (list, toFollowKey) => {
  if (!list) return false;
  return list.find((people) => people[1] === toFollowKey) ? true : false;
};

export default function PostPreviewCardNOSTR({ item, highlithedTag = "" }) {
  const { userFollowings, getNostrAuthor, nostrAuthors } = useContext(Context);
  let [isThumbnailValid, setIsThumbnailValid] = useState(false);
  const [authorData, setAuthorData] = useState(
    getEmptyNostrUser(item.author_pubkey)
  );
  const [artURL, setArtURL] = useState(`${item.naddr}`);
  const [showContent, setShowContent] = useState(!item.contentSensitive);
  const [showArrows, setShowArrows] = useState(false);
  const [scrollPX, setScrollPX] = useState(0);
  const optionsRef = useRef(null);
  const noScrollBarContainer = useRef(null);
  const noScrollBarContainerMain = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isFollowing = useMemo(() => {
    return checkFollowing(userFollowings, item.author_pubkey);
  }, [userFollowings]);

  useEffect(() => {
    let carousel_container = noScrollBarContainerMain.current;
    let carousel = noScrollBarContainer.current;
    if (!(carousel && carousel_container)) return;
    if (carousel_container.clientWidth < carousel.scrollWidth) {
      setShowArrows(true);
      setScrollPX(0);
    } else {
      setShowArrows(false);
      setScrollPX(0);
    }
  }, []);

  useEffect(() => {
    var img = new Image();
    img.onload = function () {
      setIsThumbnailValid(true);
    };
    img.onerror = function () {
      setIsThumbnailValid(false);
    };
    img.src = item.thumbnail;
  }, [item.thumbnail]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(item.author_pubkey);

        if (auth) {
          setAuthorData(auth);
        }
        return;
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
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
          kind={"article"}
          exit={() => setShowPreview(false)}
          data={{ author: authorData, content: item }}
        />
      )}

      <div
        className={"fit-container fx-scattered sc-s-18 box-pad-h-m mediacard"}
        onClick={(e) => e.stopPropagation()}
        style={{
          border: "none",
          position: "relative",
          overflow: "visible",
          columnGap: "16px",
        }}
      >
        {!showContent && (
          <div className="rvl-btn sc-s-18">
            <p className="box-pad-v-m gray-c">
              This is a sensitive content, do you wish to reveal it?
            </p>
            <button
              className="btn-small btn-normal"
              onClick={() => setShowContent(true)}
            >
              Reveal
            </button>
          </div>
        )}
        <div
          className="fx-scattered fit-container"
          style={{ columnGap: "32px" }}
        >
          <div className="fit-container">
            <div className="fx-scattered box-pad-v-m">
              <div className="fx-centered">
                <AuthorPreview author={authorData} />
                {isFollowing && (
                  <div
                    className="round-icon-small round-icon-tooltip"
                    data-tooltip="Following"
                  >
                    <div className="user-followed"></div>
                  </div>
                )}
              </div>
              <div className="fx-start-h fx-centered">
                <p className="pointer p-medium gray-c round-icon-tooltip">
                  <Date_ toConvert={item.modified_date} time={true} />
                </p>
              </div>
            </div>
            <Link
              to={`/article/${artURL}`}
              style={{ columnGap: "16px" }}
              className="fit-container fx-scattered"
            >
              <div style={{ width: "max(70%, 800px)" }}>
                <div className="fx-scattered">
                  <p className="p-three-lines p-big p-bold">{item.title}</p>
                </div>
                <div className="box-pad-v-s ">
                  <p className="p-three-lines p-medium gray-c fit-container">
                    {item.summary}
                  </p>
                </div>
              </div>
              <div
                className=" bg-img cover-bg sc-s-18"
                style={{
                  backgroundColor:
                    "linear-gradient(93deg, #880185 -6.44%, #FA4EFF 138.71%)",
                  backgroundImage: `url(${item.thumbnail})`,
                  width: "max(30%,400px)",
                  aspectRatio: "16/9",
                  border: "none",
                }}
              ></div>
            </Link>
            <div className="fit-container fx-scattered box-pad-v-m">
              <div className="fx-centered">
                <div
                  className="round-icon-small round-icon-tooltip slide-left preview-icon"
                  data-tooltip="Quick look"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <div className="eye-opened"></div>
                </div>
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Article"
                >
                  <div className="posts"></div>
                </div>
                {item.postTags.length > 0 && (
                  <div className="fit-container fx-scattered ">
                    <div
                      className="fx-centered fx-start-h no-scrollbar"
                      style={{ overflow: "hidden" }}
                      ref={noScrollBarContainerMain}
                    >
                      <div
                        className="fx-centered fx-start-h no-scrollbar"
                        style={{
                          transform: `translateX(-${scrollPX}px)`,
                          transition: ".3s ease-in-out",
                        }}
                        ref={noScrollBarContainer}
                      >
                        {item.postTags.slice(0, 3).map((tag, index) => {
                          if (!tag) return;
                          if (highlithedTag && highlithedTag === tag)
                            return (
                              <Link
                                key={`${tag}-${index}`}
                                style={{
                                  textDecoration: "none",
                                  color: "var(--white)",
                                }}
                                className="sticker sticker-small sticker-c1 fx-shrink"
                                to={`/tags/${tag.replace("#", "%23")}`}
                                target={"_blank"}
                              >
                                {tag}
                              </Link>
                            );
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
                      minWidth: "200px",
                      width: "max-content",
                      zIndex: 1000,
                      rowGap: "12px",
                    }}
                    className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                  >
                    <SaveArticleAsBookmark
                      label="Bookmark article"
                      pubkey={item.author_pubkey}
                      kind={30023}
                      d={item.d}
                      image={item.thumbnail}
                    />
                    <div className="fit-container fx-centered fx-start-h pointer">
                      <ShareLink
                        label="Share article"
                        path={`/article/${artURL}`}
                        title={authorData.author_name}
                        description={item.title}
                        kind={30023}
                        shareImgData={{
                          post: { ...item, image: item.thumbnail },
                          author: {
                            pubkey: authorData.author_pubkey,
                            picture: authorData.author_img,
                            display_name: authorData.author_name,
                          },
                          label: "Article",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
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
