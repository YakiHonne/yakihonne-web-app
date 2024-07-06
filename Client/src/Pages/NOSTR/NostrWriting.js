import React, { useEffect } from "react";
import { useContext } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import MDEditor, {
  commands,
  ICommand,
  TextState,
  TextAreaTextApi,
  bold,
  italic,
  strikethrough,
  hr,
  link,
  quote,
  code,
  codeBlock,
  unorderedListCommand,
  orderedListCommand,
  checkedListCommand,
  title,
  title1,
  title2,
  title3,
  title4,
  title5,
  title6,
  comment,
  group,
  update,
  image,
} from "@uiw/react-md-editor";
import { Context } from "../../Context/Context";
import { useState } from "react";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import PagePlaceholder from "../../Components/PagePlaceholder";
import ToPublishNOSTR from "../../Components/NOSTR/ToPublishNOSTR";
import LoadingScreen from "../../Components/LoadingScreen";
import { useLocation } from "react-router-dom";
import { SimplePool } from "nostr-tools";
import { Helmet } from "react-helmet";
import ToPublishDraftsNOSTR from "../../Components/NOSTR/ToPublishDraftsNOSTR";
import katex from "katex";
import "katex/dist/katex.css";
import axiosInstance from "../../Helpers/HTTP_Client";
const pool = new SimplePool();

const getUploadsHistory = () => {
  let history = localStorage.getItem("YakihonneUploadsHistory");
  if (history) {
    return JSON.parse(history);
  }
  return [];
};

export default function NostrWriting() {
  const { state } = useLocation();
  const {
    post_id,
    post_kind,
    post_title,
    post_desc,
    post_thumbnail,
    post_tags,
    post_d,
    post_content,
  } = state || {};
  const { nostrUser, nostrKeys, nostrUserLoaded, setToast } =
    useContext(Context);
  const [content, setContent] = useState(post_content || "");
  const [title, setTitle] = useState(post_title || "");
  const [showPublishingScreen, setShowPublishingScreen] = useState(false);
  const [showPublishingDraftScreen, setShowPublishingDraftScreen] =
    useState(false);
  const [seenOn, setSeenOn] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadsHistory, setUploadsHistory] = useState(getUploadsHistory());
  const [showUploadsHistory, setShowUploadsHistory] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value;
    let element = e.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
    setTitle(value);
    if (!value || value === "\n") {
      setTitle("");
      return;
    }
  };

  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       console.log(post_id);
  //       let sub = pool.get(nostrUser.relays, [{ kinds: "30023" }]);
  //       let relaysForEvent = pool.seenOn(post_id);

  //       setSeenOn(relaysForEvent);
  //       console.log(relaysForEvent);
  //     } catch (err) {
  //       console.log(err);
  //     }
  //   };

  //   if (post_id) fetchData();
  // }, [post_id]);

  const execute = () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.click();
      input.onchange = async (e) => {
        if (e.target.files[0]) {
          setIsLoading(true);
          let imgPath = await uploadToS3(e.target.files[0]);
          setIsLoading(false);
          resolve(imgPath);
        } else {
          resolve(false);
        }
      };
    });
  };
  const uploadToS3 = async (img) => {
    if (img) {
      try {
        let fd = new FormData();
        fd.append("file", img);
        fd.append("pubkey", nostrKeys.pub);
        let data = await axiosInstance.post("/api/v1/file-upload", fd, {
          headers: { "Content-Type": "multipart/formdata" },
        });
        localStorage.setItem(
          "YakihonneUploadsHistory",
          JSON.stringify([...uploadsHistory, data.data.image_path])
        );
        setUploadsHistory([...uploadsHistory, data.data.image_path]);
        return data.data.image_path;
      } catch {
        setToast({
          type: 2,
          desc: `The image size exceeded the required limit, the max size allowed is 1Mb.`,
        });
        return false;
      }
    }
  };
  if (!nostrUserLoaded) return <LoadingScreen />;
  return (
    <>
      {showPublishingScreen && (
        <ToPublishNOSTR
          exit={() => setShowPublishingScreen(false)}
          postContent={content}
          postTitle={title}
          postDesc={post_desc || ""}
          postThumbnail={post_thumbnail || ""}
          edit={post_d || ""}
          tags={post_tags || []}
          seenOn={seenOn || []}
          postId={post_id}
          postKind={post_kind}
        />
      )}
      {showPublishingDraftScreen && (
        <ToPublishDraftsNOSTR
          exit={() => setShowPublishingDraftScreen(false)}
          postContent={content}
          postTitle={title}
          postDesc={post_desc || ""}
          postThumbnail={post_thumbnail || ""}
          edit={post_d || ""}
          tags={post_tags || []}
          seenOn={seenOn || []}
          postId={post_id}
          postKind={post_kind}
        />
      )}
      {isLoading && <LoadingScreen />}
      {showUploadsHistory && (
        <UploadHistoryList
          exit={() => setShowUploadsHistory(false)}
          list={uploadsHistory}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | Write an article</title>
        </Helmet>
        <SidebarNOSTR />
        <main className="main-page-nostr-container">
          {nostrUser && (
            <>
              {nostrKeys.sec && (
                <>
                  <NavbarNOSTR />
                  <div className="fit-container nostr-article">
                    <div className="fit-container fx-start-v fx-scattered">
                      <div>
                        <textarea
                          className="h1-txt fit-container"
                          onChange={handleChange}
                          value={title}
                          placeholder="Give me a catchy title"
                        />
                      </div>
                      <div
                        className="fx-scattered box-marg-s"
                        style={{ flex: "1 1 400px" }}
                      >
                        {uploadsHistory.length > 0 && (
                          <div className="fit-container fx-centered fx-end-h">
                            <button
                              className="btn btn-normal fx-centered"
                              onClick={() => setShowUploadsHistory(true)}
                            >
                              <div
                                className="posts"
                                style={{ filter: "invert()" }}
                              ></div>
                              <p>Uploads history</p>
                            </button>
                          </div>
                        )}
                        <div className="fx-centered">
                          <button
                            className={`btn ${
                              title && content ? "btn-gst" : "btn-disabled"
                            }`}
                            disabled={!(title && content)}
                            onClick={() =>
                              title && content
                                ? setShowPublishingDraftScreen(true)
                                : null
                            }
                            style={{ width: "max-content" }}
                          >
                            Save as draft
                          </button>
                          <button
                            className={`btn ${
                              title && content ? "btn-normal" : "btn-disabled"
                            }`}
                            disabled={!(title && content)}
                            onClick={() =>
                              title && content
                                ? setShowPublishingScreen(true)
                                : null
                            }
                            style={{ width: "max-content" }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                    <div data-color-mode="light" className="article">
                      <MDEditor
                        height={"70vh"}
                        value={content}
                        onChange={setContent}
                        commands={[
                          bold,
                          italic,
                          strikethrough,
                          hr,
                          commands.group(
                            [
                              commands.title1,
                              commands.title2,
                              commands.title3,
                              commands.title4,
                              commands.title5,
                              commands.title6,
                            ],
                            {
                              name: "title",
                              groupName: "title",
                              buttonProps: { "aria-label": "Insert title" },
                            }
                          ),
                          link,
                          quote,
                          code,
                          codeBlock,
                          comment,
                          image,
                          commands.group([], {
                            name: "update",
                            icon: (
                              <svg
                                viewBox="0 0 1024 1024"
                                width="12"
                                height="12"
                              >
                                <path
                                  fill="currentColor"
                                  d="M716.8 921.6a51.2 51.2 0 1 1 0 102.4H307.2a51.2 51.2 0 1 1 0-102.4h409.6zM475.8016 382.1568a51.2 51.2 0 0 1 72.3968 0l144.8448 144.8448a51.2 51.2 0 0 1-72.448 72.3968L563.2 541.952V768a51.2 51.2 0 0 1-45.2096 50.8416L512 819.2a51.2 51.2 0 0 1-51.2-51.2v-226.048l-57.3952 57.4464a51.2 51.2 0 0 1-67.584 4.2496l-4.864-4.2496a51.2 51.2 0 0 1 0-72.3968zM512 0c138.6496 0 253.4912 102.144 277.1456 236.288l10.752 0.3072C924.928 242.688 1024 348.0576 1024 476.5696 1024 608.9728 918.8352 716.8 788.48 716.8a51.2 51.2 0 1 1 0-102.4l8.3968-0.256C866.2016 609.6384 921.6 550.0416 921.6 476.5696c0-76.4416-59.904-137.8816-133.12-137.8816h-97.28v-51.2C691.2 184.9856 610.6624 102.4 512 102.4S332.8 184.9856 332.8 287.488v51.2H235.52c-73.216 0-133.12 61.44-133.12 137.8816C102.4 552.96 162.304 614.4 235.52 614.4l5.9904 0.3584A51.2 51.2 0 0 1 235.52 716.8C105.1648 716.8 0 608.9728 0 476.5696c0-132.1984 104.8064-239.872 234.8544-240.2816C258.5088 102.144 373.3504 0 512 0z"
                                />
                              </svg>
                            ),
                            execute: async (state, api) => {
                              let file = await execute();
                              if (file)
                                api.replaceSelection(`![image](${file})`);
                            },
                            buttonProps: { "aria-label": "Insert title" },
                          }),
                          unorderedListCommand,
                          orderedListCommand,
                          checkedListCommand,
                        ]}
                        previewOptions={{
                          components: {
                            p: ({ children }) => {
                              return <p dir="auto">{children}</p>;
                            },
                            h1: ({ children }) => {
                              return <h1 dir="auto">{children}</h1>;
                            },
                            h2: ({ children }) => {
                              return <h2 dir="auto">{children}</h2>;
                            },
                            h3: ({ children }) => {
                              return <h3 dir="auto">{children}</h3>;
                            },
                            h4: ({ children }) => {
                              return <h4 dir="auto">{children}</h4>;
                            },
                            h5: ({ children }) => {
                              return <h5 dir="auto">{children}</h5>;
                            },
                            h6: ({ children }) => {
                              return <h6 dir="auto">{children}</h6>;
                            },
                            li: ({ children }) => {
                              return <li dir="auto">{children}</li>;
                            },
                            code: ({
                              inline,
                              children,
                              className,
                              ...props
                            }) => {
                              if (!children) return;
                              const txt = children[0] || "";

                              if (inline) {
                                if (
                                  typeof txt === "string" &&
                                  /^\$\$(.*)\$\$/.test(txt)
                                ) {
                                  const html = katex.renderToString(
                                    txt.replace(/^\$\$(.*)\$\$/, "$1"),
                                    {
                                      throwOnError: false,
                                    }
                                  );
                                  return (
                                    <code
                                      dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                  );
                                }
                                return <code>{txt}</code>;
                              }
                              if (
                                typeof txt === "string" &&
                                typeof className === "string" &&
                                /^language-katex/.test(
                                  className.toLocaleLowerCase()
                                )
                              ) {
                                const html = katex.renderToString(txt, {
                                  throwOnError: false,
                                });
                                console.log("props", txt, className, props);
                                return (
                                  <code
                                    dangerouslySetInnerHTML={{ __html: html }}
                                  />
                                );
                              }
                              let tempText = "";
                              for (let child of children)
                                tempText = tempText + child.props.children[0];
                              return (
                                <code className={String(className)}>
                                  {tempText}
                                </code>
                              );
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              {!nostrKeys.sec && nostrKeys.ext && (
                <>
                  <NavbarNOSTR />
                  <div className="fit-container nostr-article">
                    <div className="fit-container fx-start-v fx-scattered fx-wrap">
                      <div style={{ flex: "1 1 400px" }}>
                        <textarea
                          className="h1-txt fit-container"
                          onChange={handleChange}
                          value={title}
                          placeholder="Give me a catchy title"
                        />
                      </div>
                      <div
                        className="fx-scattered box-marg-s"
                        style={{ flex: "1 1 400px" }}
                      >
                        {uploadsHistory.length > 0 && (
                          <div className="fit-container fx-centered fx-end-h">
                            <button
                              className="btn btn-normal fx-centered"
                              onClick={() => setShowUploadsHistory(true)}
                            >
                              <div
                                className="posts"
                                style={{ filter: "invert()" }}
                              ></div>
                              <p>Uploads history</p>
                            </button>
                          </div>
                        )}
                        <div className="fx-centered">
                          <button
                            className={`btn ${
                              title && content ? "btn-gst" : "btn-disabled"
                            }`}
                            disabled={!(title && content)}
                            onClick={() =>
                              title && content
                                ? setShowPublishingDraftScreen(true)
                                : null
                            }
                            style={{ width: "max-content" }}
                          >
                            Save as draft
                          </button>
                          <button
                            className={`btn ${
                              title && content ? "btn-normal" : "btn-disabled"
                            }`}
                            disabled={!(title && content)}
                            onClick={() =>
                              title && content
                                ? setShowPublishingScreen(true)
                                : null
                            }
                            style={{ width: "max-content" }}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>

                    <div data-color-mode="light" className="article" dir="auto">
                      <MDEditor
                        height={"70vh"}
                        value={content}
                        onChange={setContent}
                        commands={[
                          bold,
                          italic,
                          strikethrough,
                          hr,
                          commands.group(
                            [
                              commands.title1,
                              commands.title2,
                              commands.title3,
                              commands.title4,
                              commands.title5,
                              commands.title6,
                            ],
                            {
                              name: "title",
                              groupName: "title",
                              buttonProps: { "aria-label": "Insert title" },
                            }
                          ),
                          link,
                          quote,
                          code,
                          codeBlock,
                          comment,
                          image,
                          commands.group([], {
                            name: "update",
                            icon: (
                              <svg
                                viewBox="0 0 1024 1024"
                                width="12"
                                height="12"
                              >
                                <path
                                  fill="currentColor"
                                  d="M716.8 921.6a51.2 51.2 0 1 1 0 102.4H307.2a51.2 51.2 0 1 1 0-102.4h409.6zM475.8016 382.1568a51.2 51.2 0 0 1 72.3968 0l144.8448 144.8448a51.2 51.2 0 0 1-72.448 72.3968L563.2 541.952V768a51.2 51.2 0 0 1-45.2096 50.8416L512 819.2a51.2 51.2 0 0 1-51.2-51.2v-226.048l-57.3952 57.4464a51.2 51.2 0 0 1-67.584 4.2496l-4.864-4.2496a51.2 51.2 0 0 1 0-72.3968zM512 0c138.6496 0 253.4912 102.144 277.1456 236.288l10.752 0.3072C924.928 242.688 1024 348.0576 1024 476.5696 1024 608.9728 918.8352 716.8 788.48 716.8a51.2 51.2 0 1 1 0-102.4l8.3968-0.256C866.2016 609.6384 921.6 550.0416 921.6 476.5696c0-76.4416-59.904-137.8816-133.12-137.8816h-97.28v-51.2C691.2 184.9856 610.6624 102.4 512 102.4S332.8 184.9856 332.8 287.488v51.2H235.52c-73.216 0-133.12 61.44-133.12 137.8816C102.4 552.96 162.304 614.4 235.52 614.4l5.9904 0.3584A51.2 51.2 0 0 1 235.52 716.8C105.1648 716.8 0 608.9728 0 476.5696c0-132.1984 104.8064-239.872 234.8544-240.2816C258.5088 102.144 373.3504 0 512 0z"
                                />
                              </svg>
                            ),
                            execute: async (state, api) => {
                              let file = await execute();
                              if (file)
                                api.replaceSelection(`![image](${file})`);
                            },
                            buttonProps: { "aria-label": "Insert title" },
                          }),
                          unorderedListCommand,
                          orderedListCommand,
                          checkedListCommand,
                        ]}
                        previewOptions={{
                          p: ({ children }) => {
                            return <p dir="auto">{children}</p>;
                          },
                          h1: ({ children }) => {
                            return <h1 dir="auto">{children}</h1>;
                          },
                          h2: ({ children }) => {
                            return <h2 dir="auto">{children}</h2>;
                          },
                          h3: ({ children }) => {
                            return <h3 dir="auto">{children}</h3>;
                          },
                          h4: ({ children }) => {
                            return <h4 dir="auto">{children}</h4>;
                          },
                          h5: ({ children }) => {
                            return <h5 dir="auto">{children}</h5>;
                          },
                          h6: ({ children }) => {
                            return <h6 dir="auto">{children}</h6>;
                          },
                          li: ({ children }) => {
                            return <li dir="auto">{children}</li>;
                          },
                          components: {
                            p: ({ children }) => {
                              return <p dir="auto">{children}</p>;
                            },
                            code: ({
                              inline,
                              children,
                              className,
                              ...props
                            }) => {
                              if (!children) return;
                              const txt = children[0] || "";

                              if (inline) {
                                if (
                                  typeof txt === "string" &&
                                  /^\$\$(.*)\$\$/.test(txt)
                                ) {
                                  const html = katex.renderToString(
                                    txt.replace(/^\$\$(.*)\$\$/, "$1"),
                                    {
                                      throwOnError: false,
                                    }
                                  );
                                  return (
                                    <code
                                      dangerouslySetInnerHTML={{ __html: html }}
                                    />
                                  );
                                }
                                return <code>{txt}</code>;
                              }
                              if (
                                typeof txt === "string" &&
                                typeof className === "string" &&
                                /^language-katex/.test(
                                  className.toLocaleLowerCase()
                                )
                              ) {
                                const html = katex.renderToString(txt, {
                                  throwOnError: false,
                                });
                                console.log("props", txt, className, props);
                                return (
                                  <code
                                    dangerouslySetInnerHTML={{ __html: html }}
                                  />
                                );
                              }
                              let tempText = "";
                              for (let child of children)
                                tempText = tempText + child.props.children[0];
                              return (
                                <code className={String(className)}>
                                  {tempText}
                                </code>
                              );
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
              {!nostrKeys.sec && !nostrKeys.ext && (
                <PagePlaceholder page={"nostr-unauthorized"} />
              )}
            </>
          )}
          {!nostrUser && <PagePlaceholder page={"nostr-not-connected"} />}
        </main>
      </div>
    </>
  );
}

const UploadHistoryList = ({ exit, list = [] }) => {
  const { setToast } = useContext(Context);
  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setToast({
      type: 1,
      desc: `Link was copied! 👏`,
    });
  };
  return (
    <div
      className="fixed-container fx-centered fx-end-h box-pad-h box-pad-v"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <section
        className="box-pad-v box-pad-h sc-s fx-centered fx-col fx-start-h fx-start-v"
        style={{
          position: "relative",
          width: "min(100%, 400px)",
          height: "100%",
          overflow: "scroll",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="fit-container fx-centered fx-col box-marg-s">
          <h4>Uploads history</h4>
          <p className="c1-c">{list.length} file(s)</p>
        </div>
        {list.map((item) => {
          return (
            <div
              className="sc-s bg-img cover-bg fit-container fx-centered fx-end-h fx-start-v box-pad-h-m box-pad-v-m"
              style={{
                position: "relative",
                aspectRatio: "16 / 9",
                backgroundImage: `url(${item})`,
              }}
            >
              <div
                style={{
                  aspectRatio: "1/1",
                  minWidth: "48px",
                  backgroundColor: "var(--dim-gray)",
                  borderRadius: "var(--border-r-50)",
                }}
                className="fx-centered pointer"
                onClick={() => copyLink(item)}
              >
                <div className="copy-24"></div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
