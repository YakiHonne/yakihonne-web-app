import React, { useContext, useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { filterRelays } from "../../Helpers/Encryptions";
import Date_ from "../Date_";
import AddBookmark from "./AddBookMark";

export default function BookmarksPicker({
  kind,
  pubkey,
  d,
  image,
  exit,
  itemType,
  extraData,
}) {
  const {
    nostrKeys,
    nostrUserBookmarks,
    isPublishing,
    setToPublish,
    nostrUser,
    setToast,
  } = useContext(Context);
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  const itemTypes = {
    a: `${kind}:${pubkey}:${d}`,
    e: pubkey,
    t: extraData,
  };
  const isBookmarked = (bookmark) => {
    return (
      bookmark.tags.filter((item) => item[1] === itemTypes[itemType]).length > 0
    );
  };
  const bookmarkArticle = (status, bookmark) => {
    if (!nostrKeys) {
      return false;
    }

    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    let bookmarkD = bookmark.tags.find((item) => item[0] === "d")[1];
    let itemsLeft = bookmark.tags.filter((tag) =>
      ["a", "e", "t"].includes(tag[0])
    ).length;
    let bookmarkImg =
      status && itemsLeft === 1
        ? ""
        : image || bookmark.tags.find((item) => item[0] === "image")[1];

    if (status) {
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 30003,
        content: "",
        tags: [
          [
            "client",
            "Yakihonne",
            "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
          ],
          ["d", bookmarkD],
          ["image", bookmarkImg],
          ...bookmark.tags.filter((item) => {
            if (
              item[0] !== "d" &&
              item[0] !== "image" &&
              item[1] !== itemTypes[itemType]
            )
              return item;
          }),
        ],
        allRelays: [...filterRelays(relaysOnPlatform, nostrUser?.relays || [])],
      });

      return;
    }
    try {
      setToPublish({
        nostrKeys: nostrKeys,
        kind: 30003,
        content: "",
        tags: [
          [
            "client",
            "Yakihonne",
            "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
          ],
          ["d", bookmarkD],
          ["image", bookmarkImg],
          ...bookmark.tags.filter((item) => {
            if (item[0] !== "d" && item[0] !== "image") return item;
          }),
          [itemType, itemTypes[itemType]],
        ],
        allRelays: [...filterRelays(relaysOnPlatform, nostrUser.relays)],
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {showAddBookmark && (
        <AddBookmark exit={() => setShowAddBookmark(false)} />
      )}
      <div className="fixed-container fx-centered box-pad-h">
        <section
          className="sc-s box-pad-h box-pad-v fx-centered"
          style={{ width: "min(100%, 500px)", position: "relative" }}
        >
          <div className="close" onClick={exit}>
            <div></div>
          </div>
          <div className="fx-centered fx-col fit-container">
            <h4 className="box-marg-s">Add to Bookmark</h4>

            {nostrUserBookmarks.length === 0 && (
              <div className="fx-centered" style={{ marginBottom: "1rem" }}>
                <p className="gray-c">You have no bookmarks</p>
              </div>
            )}
            {nostrUserBookmarks.map((bookmark) => {
              let status = isBookmarked(bookmark);
              return (
                <div
                  key={bookmark.id}
                  className={`fit-container fx-scattered box-pad-h-s box-pad-v-s sc-s fx-shrink pointer option`}
                  onClick={() => bookmarkArticle(status, bookmark)}
                >
                  <div
                    className="fx-centered fx-start-h "
                    style={{ width: "calc(100% - 45px)" }}
                  >
                    <div
                      className="bg-img cover-bg"
                      style={{
                        aspectRatio: "1/1",
                        minWidth: "40px",
                        borderRadius: "var(--border-r-50)",
                        backgroundImage: `url(${bookmark.bookmarkContent.image})`,
                        backgroundColor: "var(--dim-gray)",
                      }}
                    ></div>
                    <div>
                      <p className="p-one-line">
                        {bookmark.bookmarkContent.title}
                      </p>

                      <p className="gray-c p-medium">
                        {bookmark.bookmarkContent.items.length} item(s) &#8226;{" "}
                        <span className="orange-c">
                          Edited{" "}
                          <Date_
                            toConvert={new Date(bookmark.created_at * 1000)}
                          />
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="box-pad-h-s">
                    <div
                      className={status ? "bookmark-24-b" : "bookmark-24"}
                    ></div>
                  </div>
                </div>
              );
            })}
            <div
              className="sc-s-d fit-container if pointer fx-centered"
              onClick={() => setShowAddBookmark(true)}
            >
              <p className="gray-c">Create bookmark set</p>{" "}
              <p className="gray-c p-big">&#xFF0B;</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
