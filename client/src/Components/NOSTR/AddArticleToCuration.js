import React from "react";
import { SimplePool } from "nostr-tools";
import { useContext } from "react";
import { useEffect } from "react";
import { useState } from "react";
import relaysOnPlatform from "../../Content/Relays";
import { Context } from "../../Context/Context";
import { filterRelays, getParsed3000xContent } from "../../Helpers/Encryptions";
import AddCurationNOSTR from "./AddCurationNOSTR";
const pool = new SimplePool();
pool.trackRelays = true;
export default function AddArticleToCuration({ kind = 30004, d, exit }) {
  const {
    nostrKeys,
    nostrUserLoaded,
    isPublishing,
    setToPublish,
    setToast,
    nostrUser,
  } = useContext(Context);
  const [curations, setCurations] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddCuration, setShowAddCuration] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let sub = pool.subscribeMany(
          filterRelays(nostrUser?.relays || [], relaysOnPlatform),
          [{ kinds: [kind], authors: [nostrKeys.pub] }],
          {
            onevent(curation) {
              setIsLoading(true);
              let modified_date = new Date(
                curation.created_at * 1000
              ).toISOString();
              let added_date = new Date(
                curation.created_at * 1000
              ).toISOString();
              let published_at = curation.created_at;
              for (let tag of curation.tags) {
                if (tag[0] === "published_at") {
                  published_at = tag[1];
                  added_date =
                    tag[1].length > 10
                      ? new Date(parseInt(tag[1])).toISOString()
                      : new Date(parseInt(tag[1]) * 1000).toISOString();
                }
              }

              setCurations((prev) => {
                let index = prev.findIndex(
                  (item) =>
                    item.tags.find((item_) => item_[0] === "d")[1] ===
                    curation.tags.find((item_) => item_[0] === "d")[1]
                );
                let content = getParsed3000xContent(curation.tags);
                let tempArray = Array.from(prev);
                if (index !== -1) {
                  tempArray.splice(index, 1);
                  return [
                    {
                      ...curation,
                      ...content,
                      modified_date,
                      added_date,
                      published_at,
                    },
                    ...tempArray,
                  ];
                }
                return [
                  ...tempArray,
                  {
                    ...curation,
                    ...content,
                    modified_date,
                    added_date,
                    published_at,
                  },
                ];
              });

              setIsLoaded(true);
            },
            oneose() {
              setIsLoading(false);
              setIsLoaded(true);
            },
          }
        );
      } catch (err) {
        console.log(err);
      }
    };
    if (nostrKeys && nostrUserLoaded) {
      fetchData();
      return;
    }
    if (!nostrKeys && nostrUserLoaded) {
      setIsLoaded(true);
    }
  }, [nostrKeys, nostrUserLoaded]);

  const checkArticleInCuration = (list) => {
    return list.find((item) => item === d);
  };

  const saveUpdate = async (curation, selectedRelays) => {
    if (isPublishing) {
      setToast({
        type: 3,
        desc: "An event publishing is in process!",
      });
      return;
    }
    let tempTags = [
      [
        "client",
        "Yakihonne",
        "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
      ],
    ];
    let is_published_at = curation.tags.find(
      (item) => item[0] === "published_at"
    );
    let published_at = is_published_at
      ? is_published_at[1]
      : `${Math.floor(Date.now() / 1000)}`;
    tempTags.push(["d", curation.tags.find((item) => item[0] === "d")[1]]);

    tempTags.push([
      "title",
      curation.tags.find((item) => item[0] === "title")[1],
    ]);
    tempTags.push(["published_at", published_at]);
    tempTags.push([
      "description",
      curation.tags.find((item) => item[0] === "description")[1],
    ]);
    tempTags.push([
      "image",
      curation.tags.find((item) => item[0] === "image")[1],
    ]);
    for (let art of curation.items) tempTags.push(["a", art, ""]);
    tempTags.push(["a", d, ""]);

    setToPublish({
      nostrKeys: nostrKeys,
      kind: kind,
      content: "",
      tags: tempTags,
      allRelays: selectedRelays,
    });
    exit();
  };

  const checkSeenOn = (d, kind) => {
    let filteredPosts = curations.filter(
      (post) => post.d === d && post.kind === kind
    );
    let seenOn = [];
    let seenOnPool = [...pool.seenOn];
    for (let post of filteredPosts) {
      let postInPool = seenOnPool.find((item) => item[0] === post.id);
      let relaysPool = postInPool
        ? [...postInPool[1]].map((item) => item.url)
        : [];
      seenOn.push(...relaysPool);
    }
    return [...new Set(seenOn)];
  };

  return (
    <>
      {showAddCuration && (
        <AddCurationNOSTR
          exit={() => setShowAddCuration(false)}
          mandatoryKind={kind}
        />
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
            <h4>Add to curation</h4>
            <div
              className="fx-centered fx-col fit-container fx-start-h box-pad-h-m box-pad-v-m"
              style={{
                maxHeight: "60vh",
                overflow: "scroll",
                overflowX: "hidden",
              }}
            >
              {isLoaded && curations.length === 0 && (
                <div className="fx-centered" style={{ marginTop: "1rem" }}>
                  <p className="gray-c">You have no curation</p>
                </div>
              )}
              {!isLoaded && (
                <div
                  className="box-pad-h fx-centered skeleton-container if fit-container"
                  style={{
                    marginTop: "1rem",
                    backgroundColor: "var(--dim-gray)",
                    border: "none",
                  }}
                ></div>
              )}
              {curations.map((curation) => {
                let status = checkArticleInCuration(curation.items);
                let seenOn = checkSeenOn(curation.d, curation.kind);
                return (
                  <div
                    key={curation.id}
                    className={`fit-container fx-scattered box-pad-h-s box-pad-v-s sc-s fx-shrink pointer ${
                      status ? "" : "option"
                    }`}
                    onClick={
                      status
                        ? null
                        : () => {
                            saveUpdate(curation, seenOn);
                          }
                    }
                    style={{ opacity: status ? ".7" : "1" }}
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
                          backgroundImage: `url(${curation.image})`,
                          backgroundColor: "var(--dim-gray)",
                        }}
                      ></div>
                      <div>
                        <p className="p-one-line">{curation.title}</p>
                        <div className="fx-centered fx-start-h">
                          <p className="gray-c p-medium">
                            {curation.items.length} item(s)
                          </p>
                          {status && (
                            <p className="p-medium orange-c">
                              (item is already here)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {!status && (
                      <div
                        style={{
                          minWidth: "30px",
                          aspectRatio: "1/1",
                        }}
                        className="fx-centered"
                      >
                        <p className="gray-c p-big">&#xFF0B;</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className="sc-s-d fit-container if pointer fx-centered"
              onClick={() => setShowAddCuration(true)}
            >
              {" "}
              <p className="gray-c">Create curation</p>{" "}
              <p className="gray-c p-big">&#xFF0B;</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
