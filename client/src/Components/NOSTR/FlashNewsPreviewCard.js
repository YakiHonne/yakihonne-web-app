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

export default function FlashNewsPreviewCard({ item }) {
  const { userFollowings, getNostrAuthor, nostrAuthors } = useContext(Context);
  const [authorData, setAuthorData] = useState(getEmptyNostrUser(item.pubkey));
  const [artURL, setArtURL] = useState(`${item.nEvent}`);
  const optionsRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isFollowing = useMemo(() => {
    return checkFollowing(userFollowings, item.pubkey);
  }, [userFollowings]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(item.pubkey);
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
          kind={"flashnews"}
          exit={() => setShowPreview(false)}
          data={{ author: authorData, content: item }}
        />
      )}

      <div
        className={"fit-container fx-scattered sc-s-18 box-pad-h-m mediacard"}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          overflow: "visible",
          columnGap: "16px",
          border: "none",
        }}
      >
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
                <p className="p-medium gray-c">
                  <Date_
                    toConvert={new Date(item.created_at * 1000)}
                    time={true}
                  />
                </p>
              </div>
            </div>

            <Link
              to={`/flash-news/${artURL}`}
              className="fit-container fx-scattered "
            >
              <p
                className=" p-five-lines "
                style={{ width: "max(60%, 700px)" }}
              >
                {item.raw_content}
              </p>
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
                  data-tooltip="Flash news"
                >
                  <div className="news"></div>
                </div>
                {(item.is_important || item.keywords.length > 0) && (
                  <div
                    className="fx-centered fx-start-h fx-wrap"
                    style={{ rowGap: 0, columnGap: "4px" }}
                  >
                    {item.is_important && (
                      <div className="sticker sticker-small sticker-orange">
                        <svg
                          viewBox="0 0 13 12"
                          xmlns="http://www.w3.org/2000/svg"
                          className="hot"
                        >
                          <path d="M10.0632 3.02755C8.69826 3.43868 8.44835 4.60408 8.5364 5.34427C7.56265 4.13548 7.60264 2.74493 7.60264 0.741577C4.47967 1.98517 5.20595 5.57072 5.11255 6.65955C4.32705 5.98056 4.17862 4.35822 4.17862 4.35822C3.3494 4.80884 2.93359 6.01229 2.93359 6.98846C2.93359 9.34905 4.7453 11.2626 6.98011 11.2626C9.21492 11.2626 11.0266 9.34905 11.0266 6.98846C11.0266 5.58561 10.0514 4.93848 10.0632 3.02755Z"></path>
                        </svg>
                        Important
                      </div>
                    )}
                    {item.keywords.map((keyword, index) => {
                      return (
                        <Link
                          key={`${keyword}-${index}`}
                          className="sticker sticker-small sticker-gray-black"
                          to={`/tags/${keyword.replace("#", "%23")}`}
                          target={"_blank"}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {keyword}
                        </Link>
                      );
                    })}
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
                    <div>
                      <Link
                        className="fit-container "
                        onClick={(e) => e.stopPropagation()}
                        to={`/uncensored-notes/${item.nEvent}`}
                      >
                        See all uncensored notes
                      </Link>
                    </div>
                    <SaveArticleAsBookmark
                      label="Bookmark Flash news"
                      pubkey={item.id}
                      itemType="e"
                      kind="1"
                    />
                    <div className="fit-container fx-centered fx-start-h pointer">
                      <ShareLink
                        label="Share flash news"
                        path={`/flash-news/${item.nEvent}`}
                        title={authorData.author_name}
                        description={item.content}
                        kind={1}
                        shareImgData={{
                          post: { ...item, author_pubkey: item.pubkey },
                          author: authorData,
                          label: "Flash news",
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
