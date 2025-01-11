import { nip19, SimplePool } from "nostr-tools";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import ArrowUp from "../../Components/ArrowUp";
import Date_ from "../../Components/Date_";
import LoadingScreen from "../../Components/LoadingScreen";
import AddBookmark from "../../Components/NOSTR/AddBookMark";
import SaveArticleAsBookmark from "../../Components/NOSTR/SaveArticleAsBookmark";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import ToDeleteBookmark from "../../Components/NOSTR/ToDeleteBookmark";
import PagePlaceholder from "../../Components/PagePlaceholder";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { filterRelays, getParsed3000xContent } from "../../Helpers/Encryptions";
import LoadingDots from "../../Components/LoadingDots";
const pool = new SimplePool();

export default function NostrBookmarks() {
  const {
    nostrUserBookmarks,
    nostrUserLoaded,
    nostrKeys,
    setNostrUserBookmarks,
  } = useContext(Context);
  const [showAddBookmark, setShowAddBookmark] = useState(false);
  const [toEditBookmark, setToEditBookmark] = useState(false);
  const [toDeleteBookmark, setToDeleteBoormark] = useState(false);
  const [showBookmarkDetails, setShowBookmarkDetails] = useState(false);

  useEffect(() => {
    if (showBookmarkDetails) {
      let item = nostrUserBookmarks.find((item) =>
        item.tags.find(
          (tag) => tag[0] === "d" && tag[1] === showBookmarkDetails.d
        )
      );

      if (item) {
        let bookmarkContent = getParsed3000xContent(item.tags);
        setShowBookmarkDetails({
          ...item,
          ...bookmarkContent,
        });
      }
    }
  }, [nostrUserBookmarks]);

  const getDRef = () => {
    let tempArray = [];
    for (let tag of nostrUserBookmarks) {
      tempArray.push(tag.split(":").splice(2, 100).join(":"));
    }
    return tempArray;
  };

  const handleBookmarkDeletion = () => {
    let tempArr = Array.from(nostrUserBookmarks);
    let index = tempArr.findIndex(
      (bookmark) => bookmark.id === toDeleteBookmark.id
    );
    tempArr.splice(index, 1);
    setNostrUserBookmarks(tempArr);
    setToDeleteBoormark(false);
    setShowBookmarkDetails(false);
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  return (
    <div>
      <Helmet>
        <title>Yakihonne | Bookmarks</title>
      </Helmet>
      {toEditBookmark && (
        <AddBookmark
          bookmark={toEditBookmark}
          tags={toEditBookmark.tags}
          exit={() => setToEditBookmark(false)}
        />
      )}
      {toDeleteBookmark && (
        <ToDeleteBookmark
          post_id={toDeleteBookmark.id}
          title={toDeleteBookmark.title}
          exitAndRefresh={handleBookmarkDeletion}
          exit={() => setToDeleteBoormark(false)}
        />
      )}
      {showAddBookmark && (
        <AddBookmark exit={() => setShowAddBookmark(false)} />
      )}

      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main
            className="main-page-nostr-container"
            style={{ overflow: "visible" }}
          >
            <ArrowUp />
            <div className="fx-centered fit-container fx-start-h fx-start-v">
              <div style={{ flex: 1 }}>
                {!nostrKeys && <PagePlaceholder page={"nostr-not-connected"} />}
                {nostrKeys && (
                  <div className="fit-container box-pad-h-m box-pad-v">
                    {nostrUserBookmarks.length > 0 && (
                      <>
                        {!showBookmarkDetails && (
                          <>
                            <div className="fit-container fx-scattered">
                              <h4> {nostrUserBookmarks.length} Bookmarks</h4>
                              <div
                                className="round-icon round-icon-tooltip"
                                data-tooltip={"Add new bookmark"}
                                onClick={() => setShowAddBookmark(true)}
                              >
                                <p className="p-big">&#xFF0B;</p>
                              </div>
                            </div>
                            <div
                              className="fx-centered fit-container box-pad-v fx-wrap"
                              style={{ rowGap: "16px", columnGap: "16px" }}
                            >
                              {nostrUserBookmarks.map((bookmark, index) => {
                                return (
                                  <div
                                    key={bookmark.id}
                                    className={`fit-container fx-scattered  sc-s fx-shrink pointer option`}
                                    style={{ flex: "1 1 350px" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowBookmarkDetails({
                                        ...bookmark,
                                        ...bookmark.bookmarkContent,
                                      });
                                    }}
                                  >
                                    <div
                                      className="fx-scattered fx-stretch fit-container"
                                      // style={{ width: "calc(100% - 45px)" }}
                                    >
                                      <div className="fx-centered fx-start-h fx-stretch">
                                        <div
                                          className="bg-img cover-bg"
                                          style={{
                                            aspectRatio: "5/6",
                                            minWidth: "120px",
                                            backgroundImage: `url(${bookmark.bookmarkContent.image})`,
                                            backgroundColor: "var(--dim-gray)",
                                          }}
                                        ></div>
                                        <div className="fx-scattered fx-col fx-start-v box-pad-h-m box-pad-v-m">
                                          <div>
                                            <p className="p-caps">
                                              {bookmark.bookmarkContent.title}
                                            </p>
                                            <p className="gray-c p-four-lines p-medium">
                                              {
                                                bookmark.bookmarkContent
                                                  .description
                                              }
                                            </p>
                                          </div>
                                          <p className="gray-c p-medium">
                                            {
                                              bookmark.bookmarkContent.items
                                                .length
                                            }{" "}
                                            item(s) &#8226;{" "}
                                            <span className="orange-c">
                                              Edited{" "}
                                              <Date_
                                                toConvert={
                                                  new Date(
                                                    bookmark.created_at * 1000
                                                  )
                                                }
                                              />
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ flex: "1 1 350px" }}></div>
                              <div style={{ flex: "1 1 350px" }}></div>
                              <div style={{ flex: "1 1 350px" }}></div>
                              <div
                                style={{ width: "min(100%,800px)" }}
                                className="fx-around fx-wrap posts-cards"
                              ></div>
                            </div>
                          </>
                        )}
                        {showBookmarkDetails && (
                          <>
                            <BookmarkContent
                              bookmark={showBookmarkDetails}
                              setToEditBookmark={setToEditBookmark}
                              setToDeleteBoormark={setToDeleteBoormark}
                              exit={() => setShowBookmarkDetails(false)}
                            />
                          </>
                        )}
                      </>
                    )}
                    {nostrUserBookmarks.length === 0 && (
                      <PagePlaceholder page={"nostr-no-bookmarks"} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const BookmarkContent = ({
  bookmark,
  exit,
  setToEditBookmark,
  setToDeleteBoormark,
}) => {
  const { nostrUser } = useContext(Context);
  const [content, setContent] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [postKind, setPostKind] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const itemsNumber = useMemo(() => {
    if (postKind === 0)
      return content.length >= 10 || content.length === 0
        ? content.length
        : `0${content.length}`;
    let num = content.filter((item) => item.kind === postKind).length;
    return num >= 10 || num === 0 ? num : `0${num}`;
  }, [postKind, content]);

  useEffect(() => {
    let tags = bookmark.tags.filter((tag) => ["a", "e"].includes(tag[0]));
    let aDs = [];
    let aKinds = [];
    let eIDs = [];
    for (let tag of tags) {
      tag[0] === "a" &&
        aDs.push(tag[1].split(":").splice(2, 100).join(":")) &&
        aKinds.push(parseInt(tag[1].split(":")[0]));
      tag[0] === "e" && eIDs.push(tag[1]);
    }
    aKinds = [...new Set(aKinds)];

    let events = [];
    let filter = [];
    aDs.length > 0 && filter.push({ kinds: aKinds, "#d": aDs });
    eIDs.length > 0 && filter.push({ kinds: [1], ids: eIDs });
    setIsLoading(true);
    let sub = pool.subscribeMany(
      filterRelays(relaysOnPlatform, nostrUser?.relays || []),
      filter,
      {
        onevent(event) {
          if ([30004, 30005, 30023, 34235].includes(event.kind)) {
            let identifier = event.tags.find((tag) => tag[0] === "d")[1];
            setContent((prev) => {
              let status = prev.findIndex(
                (item) => item.identifier === identifier
              );

              let temp = Array.from(prev);
              var newP;
              if (status !== -1) {
                if (prev[status].created_at < event.created_at) {
                  temp.splice(status, 1);
                  newP = [...temp, { ...event, identifier }];
                } else {
                  newP = [...temp];
                }
              } else newP = [...temp, { ...event, identifier }];
              newP = newP.sort(
                (item_1, item_2) => item_2.created_at - item_1.created_at
              );
              return newP;
            });
            return;
          }
          setContent((prev) => {
            let l = event.tags.find((tag) => tag[0] === "l" && tag[1]);
            let kind = l
              ? event.kind === 1 && l[1] === "FLASH NEWS"
                ? 1
                : 11
              : 111;
            let tempEvent = { ...event };
            tempEvent.kind = kind;
            let newP = content.find((item) => item.id === tempEvent.id)
              ? [...prev]
              : [...prev, tempEvent];
            newP = newP.sort(
              (item_1, item_2) => item_2.created_at - item_1.created_at
            );
            return newP;
          });
          events.push(event);
        },
        oneose() {
          setIsLoading(false);
        },
      }
    );
  }, []);

  return (
    <div
      className="fit-container fx-centered"
      onClick={(e) => {
        e.stopPropagation();
        setShowFilter(false);
      }}
    >
      <div style={{ flex: 1 }}>
        <div className="fit-container fx-scattered box-marg-s">
          <div className="fx-centered fx-start-h pointer" onClick={exit}>
            <div className="round-icon">
              <div
                className="arrow"
                style={{ transform: "rotate(90deg)" }}
              ></div>
            </div>
            <p>Back to Bookmarks</p>
          </div>
          <div className="fx-centered fx-start-v ">
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "var(--dim-gray)",
                borderRadius: "var(--border-r-50)",
              }}
              className="fx-centered pointer"
              onClick={(e) => {
                e.stopPropagation();
                setToEditBookmark(bookmark);
              }}
            >
              <div className="edit-24"></div>
            </div>
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "var(--dim-gray)",
                borderRadius: "var(--border-r-50)",
              }}
              className="fx-centered pointer"
              onClick={(e) => {
                e.stopPropagation();
                setToDeleteBoormark(bookmark);
              }}
            >
              <div className="trash-24"></div>
            </div>
          </div>
        </div>
        <div className="fx-centered fx-start-h  fx-col fx-stretch">
          <div
            className="fit-container bg-img cover-bg sc-s-18 fx-centered fx-end-v box-marg-s"
            style={{
              backgroundImage: `url(${bookmark.image})`,
              aspectRatio: "10 / 3",
            }}
          ></div>
          <div className="fx-scattered fx-col fx-start-v">
            <div className="fx-centered fx-col fx-start-v">
              <h3 className="p-caps">{bookmark.title}</h3>
              <p className="gray-c">{bookmark.description}</p>
            </div>
            <p className="gray-c">
              {bookmark.items.length} item(s) &#8226;{" "}
              <span className="orange-c">
                Edited{" "}
                <Date_ toConvert={new Date(bookmark.created_at * 1000)} />
              </span>
            </p>
          </div>
        </div>
        {content.length > 0 && !isLoading && (
          <div className="fx-centered fx-col" style={{ marginTop: "1rem" }}>
            <div className="box-marg-s fit-container fx-scattered">
              <h4 className="gray-c fit-container fx-start-h">List</h4>
              <div style={{ position: "relative", zIndex: "100" }}>
                <div
                  style={{ position: "relative" }}
                  className="round-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFilter(!showFilter);
                  }}
                >
                  <div className="filter"></div>
                </div>
                {showFilter && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      bottom: "-5px",
                      backgroundColor: "var(--dim-gray)",
                      border: "none",
                      transform: "translateY(100%)",
                      maxWidth: "550px",
                      rowGap: "12px",
                    }}
                    className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <h5>Filter</h5>
                    <label
                      htmlFor="radio-all"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-all"
                        checked={postKind === 0}
                        onChange={() => setPostKind(0)}
                      />{" "}
                      <span style={{ width: "max-content" }}>All content</span>
                    </label>
                    <label
                      htmlFor="radio-published"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-published"
                        checked={postKind === 30023}
                        onChange={() => setPostKind(30023)}
                      />{" "}
                      <span style={{ width: "max-content" }}>Articles</span>
                    </label>
                    <label
                      htmlFor="radio-ac"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-ac"
                        checked={postKind === 30004}
                        onChange={() => setPostKind(30004)}
                      />{" "}
                      <span style={{ width: "max-content" }}>
                        Articles curations
                      </span>
                    </label>
                    <label
                      htmlFor="radio-vc"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-vc"
                        checked={postKind === 30005}
                        onChange={() => setPostKind(30005)}
                      />{" "}
                      <span style={{ width: "max-content" }}>
                        Videos curations
                      </span>
                    </label>
                    <label
                      htmlFor="radio-bf"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-bf"
                        checked={postKind === 111}
                        onChange={() => setPostKind(111)}
                      />{" "}
                      <span style={{ width: "max-content" }}>Notes</span>
                    </label>
                    <label
                      htmlFor="radio-fn"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-fn"
                        checked={postKind === 1}
                        onChange={() => setPostKind(1)}
                      />{" "}
                      <span style={{ width: "max-content" }}>Flash news</span>
                    </label>
                    <label
                      htmlFor="radio-vd"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-vd"
                        checked={postKind === 34235}
                        onChange={() => setPostKind(34235)}
                      />{" "}
                      <span style={{ width: "max-content" }}>Videos</span>
                    </label>
                    <label
                      htmlFor="radio-bf"
                      className="fit-container fx-centered fx-start-h"
                    >
                      <input
                        type="radio"
                        name="filter"
                        id="radio-bf"
                        checked={postKind === 11}
                        onChange={() => setPostKind(11)}
                      />{" "}
                      <span style={{ width: "max-content" }}>Buzz feed</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            {itemsNumber === 0 && (
              <div
                className="fx-centered fx-col fit-container"
                style={{ height: "20vh" }}
              >
                <h4>No items</h4>
                <p className="gray-c p-centered" style={{ maxWidth: "350px" }}>
                  Change your filter to get more items
                </p>
              </div>
            )}
            {content.map((item) => {
              let content = getParsed3000xContent(item.tags);
              let naddr = [30004, 30023, 30005, 34235].includes(item.kind)
                ? nip19.naddrEncode({
                    identifier: content.d,
                    pubkey: item.pubkey,
                    kind: item.kind,
                  })
                : "";
              let nEvent = [1, 11, 111].includes(item.kind)
                ? nip19.neventEncode({
                    author: item.pubkey,
                    id: item.id,
                  })
                : "";
              if (!postKind && [30004, 30023, 30005, 34235].includes(item.kind))
                return (
                  <div
                    className="sc-s-18 fit-container fx-scattered box-pad-h-s box-pad-v-s"
                    style={{ position: "relative" }}
                    key={item.id}
                  >
                    {[30004].includes(item.kind) && (
                      <div
                        style={{
                          position: "absolute",
                          padding: "0 1rem",
                          left: "-2rem",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-90deg)",
                          transformOrigin: "center",
                          backgroundColor: "var(--green-main)",
                          color: "white",
                          borderRadius: "var(--border-r-18)",
                        }}
                      >
                        <p className="p-small">curation</p>
                      </div>
                    )}
                    {[30005].includes(item.kind) && (
                      <div
                        style={{
                          position: "absolute",
                          padding: "0 1rem",
                          left: "-2rem",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-90deg)",
                          transformOrigin: "center",
                          backgroundColor: "var(--orange-main)",
                          color: "white",
                          borderRadius: "var(--border-r-18)",
                        }}
                      >
                        <p className="p-small">curation</p>
                      </div>
                    )}
                    {[34235].includes(item.kind) && (
                      <div
                        style={{
                          position: "absolute",
                          padding: "0 1rem",
                          left: "-1.65rem",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-90deg)",
                          transformOrigin: "center",
                          backgroundColor: "var(--blue-main)",
                          color: "white",
                          borderRadius: "var(--border-r-18)",
                        }}
                      >
                        <p className="p-small">video</p>
                      </div>
                    )}
                    <div
                      className={`fx-centered ${
                        [30004, 30005, 34235].includes(item.kind) &&
                        "box-pad-h-m"
                      }`}
                    >
                      <div
                        className="bg-img cover-bg sc-s-18"
                        style={{
                          aspectRatio: "1 / 1",
                          minWidth: "64px",
                          backgroundImage: `url(${content.image})`,
                          backgroundColor: "var(--dim-gray)",
                        }}
                      ></div>
                      <div>
                        <p className="p-one-line">{content.title}</p>
                        <p className="p-medium gray-c">
                          Edited on{" "}
                          <Date_ toConvert={new Date(item.created_at * 1000)} />
                        </p>
                      </div>
                    </div>
                    <div className="box-pad-h-s fx-centered">
                      <Link
                        target={"_blank"}
                        to={
                          (item.kind === 30023 && `/article/${naddr}`) ||
                          ([30005, 30004].includes(item.kind) &&
                            `/curations/${naddr}`) ||
                          (item.kind === 34235 && `/videos/${naddr}`)
                        }
                      >
                        <div className="share-icon-24"></div>
                      </Link>
                      <SaveArticleAsBookmark
                        pubkey={item.pubkey}
                        kind={item.kind}
                        d={content.d}
                        image={content.image}
                      />
                    </div>
                  </div>
                );
              if (
                (!postKind && item.kind === 1) ||
                (postKind && postKind === 1 && item.kind === 1)
              )
                return (
                  <div
                    className="sc-s-18 fit-container fx-scattered box-pad-h-s box-pad-v-s"
                    style={{ position: "relative" }}
                    key={item.id}
                  >
                    <div
                      style={{
                        position: "absolute",
                        padding: "0 1rem",
                        left: "-2.5rem",
                        top: "50%",
                        transform: "translateY(-50%) rotate(-90deg)",
                        transformOrigin: "center",
                        backgroundColor: "var(--black)",
                        color: "var(--white)",
                        borderRadius: "var(--border-r-18)",
                      }}
                    >
                      <p className="p-small">Flash news</p>
                    </div>
                    <div className="fx-centered box-pad-h-m">
                      <div
                        className="sc-s-18 fx-centered"
                        style={{
                          aspectRatio: "1 / 1",
                          minWidth: "64px",
                        }}
                      >
                        <div className="news-24"></div>
                      </div>
                      <div>
                        <p className="p-one-line">
                          {item.content.substring(0, 100)}
                        </p>
                        <p className="p-medium gray-c">
                          Edited on{" "}
                          <Date_ toConvert={new Date(item.created_at * 1000)} />
                        </p>
                      </div>
                    </div>
                    <div className="box-pad-h-s fx-centered">
                      <Link target={"_blank"} to={`/flash-news/${nEvent}`}>
                        <div className="share-icon-24"></div>
                      </Link>
                      <SaveArticleAsBookmark
                        pubkey={item.id}
                        kind={item.kind}
                        itemType="e"
                      />
                    </div>
                  </div>
                );
              if (
                (!postKind && item.kind === 11) ||
                (postKind && postKind === 11 && item.kind === 11)
              )
                return (
                  <div
                    className="sc-s-18 fit-container fx-scattered box-pad-h-s box-pad-v-s"
                    style={{ position: "relative" }}
                    key={item.id}
                  >
                    <div
                      style={{
                        position: "absolute",
                        padding: "0 1rem",
                        left: "-2.2rem",
                        top: "50%",
                        transform: "translateY(-50%) rotate(-90deg)",
                        transformOrigin: "center",
                        backgroundColor: "var(--red-main)",
                        color: "white",
                        borderRadius: "var(--border-r-18)",
                      }}
                    >
                      <p className="p-small">Buzz feed</p>
                    </div>
                    <div className="fx-centered box-pad-h-m">
                      <div
                        className="bg-img cover-bg sc-s-18"
                        style={{
                          aspectRatio: "1 / 1",
                          minWidth: "64px",
                          backgroundImage: `url(${content.image})`,
                          backgroundColor: "var(--dim-gray)",
                        }}
                      ></div>
                      <div>
                        <p className="p-one-line">
                          {item.content.substring(0, 100)}
                        </p>
                        <p className="p-medium gray-c">
                          Edited on{" "}
                          <Date_ toConvert={new Date(item.created_at * 1000)} />
                        </p>
                      </div>
                    </div>
                    <div className="box-pad-h-s fx-centered">
                      <Link target={"_blank"} to={`/buzz-feed/${nEvent}`}>
                        <div className="share-icon-24"></div>
                      </Link>
                      <SaveArticleAsBookmark
                        pubkey={item.id}
                        kind={1}
                        itemType="e"
                      />
                    </div>
                  </div>
                );
              if (
                (!postKind && item.kind === 111) ||
                (postKind && postKind === 111 && item.kind === 111)
              )
                return (
                  <div
                    className="sc-s-18 fit-container fx-scattered box-pad-h-s box-pad-v-s"
                    style={{ position: "relative" }}
                    key={item.id}
                  >
                    <div
                      style={{
                        position: "absolute",
                        padding: "0 1rem",
                        left: "-1.4rem",
                        top: "50%",
                        transform: "translateY(-50%) rotate(-90deg)",
                        transformOrigin: "center",
                        backgroundColor: "var(--blue-main)",
                        color: "white",
                        borderRadius: "var(--border-r-18)",
                      }}
                    >
                      <p className="p-small">Note</p>
                    </div>
                    <div className="fx-centered box-pad-h-m">
                      <div
                        className="bg-img cover-bg sc-s-18"
                        style={{
                          aspectRatio: "1 / 1",
                          minWidth: "64px",
                          backgroundImage: `url(${content.image})`,
                          backgroundColor: "var(--dim-gray)",
                        }}
                      ></div>
                      <div>
                        <p className="p-one-line">
                          {item.content.substring(0, 100)}
                        </p>
                        <p className="p-medium gray-c">
                          Edited on{" "}
                          <Date_ toConvert={new Date(item.created_at * 1000)} />
                        </p>
                      </div>
                    </div>
                    <div className="box-pad-h-s fx-centered">
                      <Link target={"_blank"} to={`/notes/${nEvent}`}>
                        <div className="share-icon-24"></div>
                      </Link>
                      <SaveArticleAsBookmark
                        pubkey={item.id}
                        kind={1}
                        itemType="e"
                      />
                    </div>
                  </div>
                );
              if (item.kind === postKind)
                return (
                  <div
                    className="sc-s-18 fit-container fx-scattered box-pad-h-s box-pad-v-s"
                    style={{ position: "relative" }}
                    key={item.id}
                  >
                    {[30004].includes(item.kind) && (
                      <div
                        style={{
                          position: "absolute",
                          padding: "0 1rem",
                          left: "-2rem",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-90deg)",
                          transformOrigin: "center",
                          backgroundColor: "var(--c1)",
                          color: "var(--white)",
                          borderRadius: "var(--border-r-18)",
                        }}
                      >
                        <p className="p-small">curation</p>
                      </div>
                    )}
                    <div
                      className={`fx-centered ${
                        [30004].includes(item.kind) && "box-pad-h-m"
                      }`}
                    >
                      <div
                        className="bg-img cover-bg sc-s-18"
                        style={{
                          aspectRatio: "1 / 1",
                          minWidth: "64px",
                          backgroundImage: `url(${content.image})`,
                          backgroundColor: "var(--dim-gray)",
                        }}
                      ></div>
                      <div>
                        <p className="p-one-line">{content.title}</p>
                        <p className="p-medium gray-c">
                          Edited on{" "}
                          <Date_ toConvert={new Date(item.created_at * 1000)} />
                        </p>
                      </div>
                    </div>
                    <div className="box-pad-h-s fx-centered">
                      <Link
                        target={"_blank"}
                        to={
                          item.kind === 30023
                            ? `/article/${naddr}`
                            : `/curations/${naddr}`
                        }
                      >
                        <div className="share-icon-24"></div>
                      </Link>
                      <SaveArticleAsBookmark
                        pubkey={item.pubkey}
                        kind={item.kind}
                        d={content.d}
                        image={content.image}
                      />
                    </div>
                  </div>
                );
            })}
          </div>
        )}
        {content.length === 0 && !isLoading && (
          <div
            className="fx-centered fx-col fit-container"
            style={{ height: "30vh" }}
          >
            <h4>No items</h4>
            <p className="gray-c p-centered" style={{ maxWidth: "350px" }}>
              You can bookmark articles and curation in one set
            </p>
          </div>
        )}
        {isLoading && (
          <div className="fx-centered fit-container" style={{ height: "30vh" }}>
            <p>Loading</p>
            <LoadingDots />
          </div>
        )}
      </div>
    </div>
  );
};
