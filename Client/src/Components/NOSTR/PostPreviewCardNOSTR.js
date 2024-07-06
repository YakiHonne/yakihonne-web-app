import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Date_ from "../Date_";
import placeholder from "../../media/images/nostr-thumbnail-ph.svg";
import { Context } from "../../Context/Context";
import relaysOnPlatform from "../../Content/Relays";
import { relayInit, SimplePool } from "nostr-tools";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";

const pool = new SimplePool();

const checkFollowing = (list, toFollowKey) => {
  if (!list) return false;
  return list.find((people) => people[1] === toFollowKey) ? true : false;
};

export default function PostPreviewCardNOSTR({ item, highlithedTag = "" }) {
  const { nostrUser } = useContext(Context);
  let [isThumbnailValid, setIsThumbnailValid] = useState(false);
  const [showContent, setShowContent] = useState(!item.contentSensitive);

  const isFollowing = useMemo(() => {
    return checkFollowing(nostrUser?.following, item.author_pubkey);
  }, [nostrUser]);

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

  return (
    <div
      className={"posts-card fx-scattered sc-s-18 box-pad-h-m"}
      onClick={(e) => e.stopPropagation()}
      style={{
        borderColor: isFollowing ? "var(--c1)" : "",
        position: "relative",
        overflow: "visible",
        columnGap: "16px",
      }}
    >
      {/* <div
        className="fx-centered pointer"
        style={{
          position: "absolute",
          right: "-10px",
          top: "-10px",
          borderRadius: "var(--border-r-50)",
          height: "40px",
          width: "40px",
          backgroundColor: "var(--dim-gray)",
        }}
      >
        <SaveArticleAsBookmark pubkey={item.author_pubkey} d={item.d} />
      </div> */}
      {!showContent && (
        <div className="rvl-btn">
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
        className="box-pad-v fx-scattered posts-card-desc"
        style={{ columnGap: "32px" }}
      >
        <div
          className="fit-container"
          // style={{ width: "calc(100% - 50px)" }}
          // onClick={() => navigateTo(`/article/${item.naddr}`)}
        >
          <div className="fx-centered fx-start-h box-marg-s">
            <AuthorPreview author={item} />
            <p className="p-medium gray-c">|</p>
            <p className="gray-c p-medium">
              On <Date_ toConvert={item.added_date} />
            </p>
            {isFollowing && (
              <div className="sticker sticker-small sticker-c1">following</div>
            )}
          </div>
          <Link
            to={`/article/${item.naddr}`}
            className="fit-container fx-centered fx-start-h fx-start-v fx-col"
            style={{
              // width: "fit-content",
              aspectRatio: "unset",
              borderRadius: "0",
            }}
          >
            <div className="fit-container fx-scattered">
              <h4>{item.title}</h4>
              {/* {item.thumbnail && ( */}
              <div className="pointer thumbnail-mob">
                <div
                  className="fit-container bg-img cover-bg"
                  style={{
                    backgroundColor:
                      "linear-gradient(93deg, #880185 -6.44%, #FA4EFF 138.71%)",
                    backgroundImage: isThumbnailValid
                      ? `url(${item.thumbnail})`
                      : `url(${placeholder})`,
                    width: "50px",
                    height: "50px",
                    borderRadius: "var(--border-r-50)",
                  }}
                ></div>
              </div>
              {/* )} */}
            </div>
            <div className="box-pad-v-s">
              <p className="p-four-lines p-medium gray-c">{item.summary}</p>
            </div>
          </Link>
          <div
            className="fit-container fx-scattered"
            style={{ marginTop: ".5rem" }}
          >
            <div
              className="fx-centered fx-start-h no-scrollbar"
              style={{ overflow: "scroll", width: "80%" }}
            >
              {item.postTags.map((tag, index) => {
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
                      to={`/tags/${tag}`}
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
                    to={`/tags/${tag}`}
                    target={"_blank"}
                  >
                    {tag}
                  </Link>
                );
              })}
            </div>
            <SaveArticleAsBookmark pubkey={item.author_pubkey} d={item.d} />
          </div>
        </div>
      </div>

      <Link
        className="pointer thumbnail"
        // style={{ minWidth: "200px",  aspectRatio: "16 / 9" }}
        to={`/article/${item.naddr}`}
      >
        <div
          className="fit-container bg-img cover-bg"
          style={{
            backgroundColor:
              "linear-gradient(93deg, #880185 -6.44%, #FA4EFF 138.71%)",
            backgroundImage: isThumbnailValid
              ? `url(${item.thumbnail})`
              : `url(${placeholder})`,
            // width: "min(100%,100px)",
            // aspectRatio: "16/9",
            width: "100%",
            height: "100%",
          }}
        ></div>
      </Link>
    </div>
  );
}

const AuthorPreview = ({ author }) => {
  const [authorData, setAuthorData] = useState("");
  const { relayConnect } = useContext(Context);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await relayConnect.connect();
        let sub = relayConnect.sub([
          { kinds: [0], authors: [author.author_pubkey], limit: 1 },
        ]);
        // let sub = pool.sub(relaysOnPlatform, [
        //   { kinds: [0], authors: [author.author_pubkey], limit: 1 },
        // ]);
        sub.on("event", (event) => {
          let author_img = event ? JSON.parse(event.content).picture : "";
          let author_name = event
            ? JSON.parse(event.content).name?.substring(0, 20) ||
              event.pubkey?.substring(0, 20)
            : event.pubkey?.substring(0, 20);
          let author_pubkey = event.pubkey;
          setAuthorData((auth) => {
            return { author_img, author_name, author_pubkey };
          });
          return;
        });
        sub.on("eose", () => {
          // pool.close(relaysOnPlatform);
          sub.unsub();
        });
      } catch (err) {
        console.log(err);
      }
    };
    if (relayConnect) fetchData();
  }, [author, relayConnect]);

  if (!authorData)
    return (
      <>
        <UserProfilePicNOSTR
          size={24}
          ring={false}
          img={author.author_img}
          mainAccountUser={false}
          user_id={author.author_pubkey}
        />

        <p className="p-one-line p-medium">
          By: <span className="c1-c">{author.author_name}</span>
        </p>
      </>
    );
  return (
    <>
      <UserProfilePicNOSTR
        size={24}
        ring={false}
        img={authorData.author_img}
        mainAccountUser={false}
        user_id={authorData.author_pubkey}
      />

      <p className="p-one-line p-medium">
        By: <span className="c1-c">{authorData.author_name}</span>
      </p>
    </>
  );
};
