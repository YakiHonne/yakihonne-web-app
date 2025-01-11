import React, { useContext, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Date_ from "../Date_";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import NumberShrink from "../NumberShrink";
import relaysOnPlatform from "../../Content/Relays";
import ShowUsersList from "./ShowUsersList";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import UN from "./UN";
import SaveArticleAsBookmark from "./SaveArticleAsBookmark";
import ShareLink from "../ShareLink";

export default function FlashNewsCard({
  self = "false",
  timeline = true,
  newsContent,
  upvoteReaction = [],
  downvoteReaction = [],
  refreshRating,
}) {
  const { nostrKeys, nostrUser, isPublishing, setToast, setToPublish } =
    useContext(Context);
  const navigateTo = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [author, setAuthor] = useState(newsContent.author);
  const isMisLeading = newsContent.sealed_note
    ? JSON.parse(newsContent.sealed_note.content).tags.find(
        (tag) => tag[0] === "type" && tag[1] === "-"
      )
    : false;
  const isContributed = useMemo(() => {
    return newsContent.is_note_new && nostrKeys
      ? newsContent.pubkeys_in_new_un.find((pubkey) => pubkey === nostrKeys.pub)
      : false;
  }, [newsContent, nostrKeys]);
  const [usersList, setUsersList] = useState(false);

  const isVoted = useMemo(() => {
    return nostrKeys
      ? upvoteReaction
          .concat(downvoteReaction)
          .find((item) => item.pubkey === nostrKeys.pub)
      : false;
  }, [upvoteReaction, downvoteReaction, nostrKeys]);

  const upvoteNews = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      if (!nostrKeys) {
        return false;
      }
      if (isVoted) {
        setIsLoading(true);
        setToPublish({
          nostrKeys: nostrKeys,
          kind: 5,
          content: "This vote will be deleted!",
          tags: [["e", isVoted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser.relays),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });

        setIsLoading(false);

        if (isVoted.content === "+") {
          let tempArray = Array.from(upvoteReaction);
          let index = tempArray.findIndex((item) => item.id === isVoted.id);
          tempArray.splice(index, 1);
          refreshRating(isVoted.id);
          return false;
        }
        let tempArray = Array.from(downvoteReaction);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        refreshRating(isVoted.id);
      }

      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 7,
        content: "+",
        tags: [
          ["e", newsContent.id],
          ["p", newsContent.author.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const downvoteNews = async (e) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    try {
      if (!nostrKeys) {
        return false;
      }
      if (isVoted) {
        setIsLoading(true);
        setToPublish({
          nostrKeys: nostrKeys,
          kind: 5,
          content: "This vote will be deleted!",
          tags: [["e", isVoted.id]],
          allRelays: nostrUser
            ? [
                ...filterRelays(relaysOnPlatform, nostrUser.relays),
                "wss://nostr.wine",
              ]
            : [...relaysOnPlatform, "wss://nostr.wine"],
        });
        setIsLoading(false);
        if (isVoted.content === "-") {
          let tempArray = Array.from(downvoteReaction);
          let index = tempArray.findIndex((item) => item.id === isVoted.id);
          tempArray.splice(index, 1);
          refreshRating(isVoted.id);
          return false;
        }
        let tempArray = Array.from(upvoteReaction);
        let index = tempArray.findIndex((item) => item.id === isVoted.id);
        tempArray.splice(index, 1);
        refreshRating(isVoted.id);
      }
      setIsLoading(true);
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 7,
        content: "-",
        tags: [
          ["e", newsContent.id],
          ["p", newsContent.author.pubkey],
        ],
        allRelays: nostrUser
          ? [...filterRelays(relaysOnPlatform, nostrUser.relays)]
          : relaysOnPlatform,
      });

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  return (
    <>
      {usersList && (
        <ShowUsersList
          exit={() => setUsersList(false)}
          title={usersList.title}
          list={usersList.list}
          extras={usersList.extras}
        />
      )}

      <div
        className={`fx-centered fx-col fx-start-v  ${
          !timeline
            ? "sc-s-18 box-pad-h-m box-pad-v-m option pointer"
            : "note-card"
        }`}
        style={{
          width: "calc(100%)",
          overflow: "visible",
        }}
        onClick={(e) => {
          e.stopPropagation();
          navigateTo(`/flash-news/${newsContent.nEvent}`);
        }}
      >
        <p className="gray-c">
          <Date_
            toConvert={new Date(newsContent.created_at * 1000).toISOString()}
            timeOnly={true}
          />
        </p>
        {!self && (
          <div className="fx-centered fit-container fx-start-h">
            <UserProfilePicNOSTR
              img={author.picture}
              size={20}
              user_id={author.pubkey}
              ring={false}
            />
            <p className="p-medium gray-c">
              by <span className="c1-c">{author.name}</span>
            </p>
          </div>
        )}
        {(newsContent.is_important || newsContent.keywords.length > 0) && (
          <div
            className="fx-centered fx-start-h fx-wrap"
            style={{ rowGap: 0, columnGap: "4px" }}
          >
            {newsContent.is_important && (
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
            {newsContent.keywords.map((keyword, index) => {
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
        <div className="fit-container">{newsContent.note_tree}</div>
        <div className="fit-container fx-scattered box-pad-v-s">
          {timeline && (
            <div className="fx-centered">
              <div
                className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
                style={{ columnGap: "8px" }}
              >
                <div
                  className={"icon-tooltip"}
                  data-tooltip="Upvote"
                  onClick={upvoteNews}
                >
                  <div
                    className={
                      isVoted?.content === "+" ? "arrow-up-bold" : "arrow-up"
                    }
                    style={{ opacity: isVoted?.content === "-" ? ".2" : 1 }}
                  ></div>
                </div>
                <div
                  className="icon-tooltip"
                  data-tooltip="Upvoters"
                  onClick={(e) => {
                    e.stopPropagation();
                    upvoteReaction.length > 0 &&
                      setUsersList({
                        title: "Upvoters",
                        list: upvoteReaction.map((item) => item.pubkey),
                        extras: [],
                      });
                  }}
                >
                  <NumberShrink value={upvoteReaction.length} />
                </div>
              </div>
              <div
                className={`fx-centered pointer ${isLoading ? "flash" : ""}`}
                style={{ columnGap: "8px" }}
              >
                <div
                  className="icon-tooltip"
                  data-tooltip="Downvote"
                  onClick={downvoteNews}
                >
                  <div
                    className={
                      isVoted?.content === "-" ? "arrow-up-bold" : "arrow-up"
                    }
                    style={{
                      transform: "rotate(180deg)",
                      opacity: isVoted?.content === "+" ? ".2" : 1,
                    }}
                  ></div>
                </div>
                <div
                  className="icon-tooltip"
                  data-tooltip="Downvoters"
                  onClick={(e) => {
                    e.stopPropagation();
                    downvoteReaction.length > 0 &&
                      setUsersList({
                        title: "Downvoters",
                        list: downvoteReaction.map((item) => item.pubkey),
                        extras: [],
                      });
                  }}
                >
                  <NumberShrink value={downvoteReaction.length} />
                </div>
              </div>
              <p>|</p>
              <ShareLink
                path={`/flash-news/${newsContent.nEvent}`}
                title={
                  newsContent.author.display_name || newsContent.author.name
                }
                description={newsContent.content}
                kind={1}
                shareImgData={{
                  post: newsContent,
                  author: newsContent.author,
                  label: "Flash news",
                }}
              />
            </div>
          )}
          <div className="fx-centered">
            {newsContent.source && (
              <a
                target={"_blank"}
                href={newsContent.source}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="round-icon round-icon-tooltip"
                  data-tooltip="source"
                >
                  <div className="globe-24"></div>
                </div>
              </a>
            )}
            {!self && (
              <>
                {newsContent.is_note_new &&
                  newsContent.author.pubkey !== nostrKeys.pub &&
                  !isContributed && (
                    <Link
                      className="round-icon round-icon-tooltip pointer"
                      data-tooltip="Write uncensored note"
                      to={`/uncensored-notes/${newsContent.nEvent}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="add-note-24"></div>
                    </Link>
                  )}
                {newsContent.is_note_new &&
                  newsContent.author.pubkey !== nostrKeys.pub &&
                  isContributed && (
                    <Link
                      className="round-icon-tooltip pointer"
                      data-tooltip="Already contributed!"
                      to={`/uncensored-notes/${newsContent.nEvent}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div
                        className="checkmark"
                        style={{
                          minWidth: "3rem",
                          aspectRatio: "1/1",
                          opacity: ".3",
                          filter: "brightness(0)",
                        }}
                      ></div>
                    </Link>
                  )}
              </>
            )}
            <div
              className="round-icon round-icon-tooltip"
              data-tooltip="Bookmark flash news"
              onClick={(e) => e.stopPropagation()}
            >
              <SaveArticleAsBookmark
                pubkey={newsContent.id}
                itemType="e"
                kind="1"
              />
            </div>
          </div>
        </div>
        {newsContent.sealed_note && isMisLeading && (
          <UN
            data={JSON.parse(newsContent.sealed_note.content)}
            state="sealed"
            setTimestamp={() => null}
            flashNewsAuthor={newsContent.author.pubkey}
            sealedCauses={newsContent.sealed_note.tags
              .filter((tag) => tag[0] === "cause")
              .map((cause) => cause[1])}
          />
        )}
      </div>
    </>
  );
}
