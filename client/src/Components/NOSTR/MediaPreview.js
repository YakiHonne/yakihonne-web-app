import React, { useContext } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import katex from "katex";
import { getComponent, getVideoFromURL } from "../../Helpers/Helpers";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import Follow from "./Follow";

export default function MediaPreview({ kind, data, exit }) {
  const { isDarkMode } = useContext;
  let { author, content } = data;
  if (kind === "article")
    return (
      <div className="fixed-container box-pad-h fx-centered" onClick={exit}>
        <div
          className="box-pad-h-m sc-s slide-up"
          style={{
            position: "relative",
            overflow: "scroll",
            maxHeight: "90vh",
            width: "min(100%, 700px)",
            backgroundColor: "var(--white)",
            animationDelay: ".2s",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky fx-scattered fit-container fx-start-v ">
            <div className="fx-centered box-pad-h-m box-pad-v-s">
              <UserProfilePicNOSTR
                size={40}
                mainAccountUser={false}
                ring={false}
                user_id={author.pubkey}
                img={author.picture}
              />
              <div>
                <p className="p-bold">{author.display_name || author.name}</p>
                <p className="p-medium gray-c">
                  @{author.name || author.display_name}
                </p>
              </div>
              <Follow
                size="small"
                toFollowKey={author.pubkey}
                toFollowName={""}
                bulkList={[]}
              />
            </div>
            <div className="box-pad-h-s box-pad-v-s">
              <div
                className="close"
                style={{ position: "static" }}
                onClick={exit}
              >
                <div></div>
              </div>
            </div>
          </div>
          <div
            className="fit-container fx-scattered fx-start-v box-pad-h-m"
            style={{ columnGap: "10px" }}
            dir="auto"
          >
            <h3 dir="auto">{content.title}</h3>
          </div>
          {content.description && (
            <div className="box-pad-v-m fit-container box-pad-h-m">
              <p className="quote-txt">{content.description}</p>
            </div>
          )}
          <div className="article fit-container box-pad-h-m box-pad-v">
            <MarkdownPreview
              wrapperElement={{
                "data-color-mode": isDarkMode === "0" ? "dark" : "light",
              }}
              source={content.content}
              rehypeRewrite={(node, index, parent) => {
                if (
                  node.tagName === "a" &&
                  parent &&
                  /^h(1|2|3|4|5|6)/.test(parent.tagName)
                ) {
                  parent.children = parent.children.slice(1);
                }
              }}
              components={{
                p: ({ children }) => {
                  return <>{getComponent(children)}</>;
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
                code: ({ inline, children, className, ...props }) => {
                  if (!children) return;
                  const txt = children[0] || "";

                  if (inline) {
                    if (typeof txt === "string" && /^\$\$(.*)\$\$/.test(txt)) {
                      const html = katex.renderToString(
                        txt.replace(/^\$\$(.*)\$\$/, "$1"),
                        {
                          throwOnError: false,
                        }
                      );
                      return (
                        <code
                          dangerouslySetInnerHTML={{
                            __html: html,
                          }}
                        />
                      );
                    }
                    return <code dangerouslySetInnerHTML={{ __html: txt }} />;
                  }
                  if (
                    typeof txt === "string" &&
                    typeof className === "string" &&
                    /^language-katex/.test(className.toLocaleLowerCase())
                  ) {
                    const html = katex.renderToString(txt, {
                      throwOnError: false,
                    });
                    console.log("props", txt, className, props);
                    return <code dangerouslySetInnerHTML={{ __html: html }} />;
                  }

                  return <code className={String(className)}>{children}</code>;
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  if (kind === "flashnews")
    return (
      <div className="fixed-container box-pad-h fx-centered" onClick={exit}>
        <div
          className="box-pad-h-m sc-s slide-up"
          style={{
            position: "relative",
            overflow: "scroll",
            maxHeight: "90vh",
            width: "min(100%, 700px)",
            backgroundColor: "var(--white)",
            animationDelay: ".2s",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky fx-scattered fit-container fx-start-v ">
            <div className="fx-centered box-pad-h-m box-pad-v-s">
              <UserProfilePicNOSTR
                size={40}
                mainAccountUser={false}
                ring={false}
                user_id={author.pubkey}
                img={author.picture}
              />
              <div>
                <p className="p-bold">{author.display_name || author.name}</p>
                <p className="p-medium gray-c">
                  @{author.name || author.display_name}
                </p>
              </div>
              <Follow
                size="small"
                toFollowKey={author.pubkey}
                toFollowName={""}
                bulkList={[]}
              />
            </div>
            <div className="box-pad-h-s box-pad-v-s">
              <div
                className="close"
                style={{ position: "static" }}
                onClick={exit}
              >
                <div></div>
              </div>
            </div>
          </div>

          <div
            className="article fit-container box-pad-h-m "
            style={{ pointerEvents: "none", marginBottom: "1.5rem" }}
          >
            {content.content}
          </div>
        </div>
      </div>
    );
  if (kind === "video")
    return (
      <div className="fixed-container box-pad-h fx-centered" onClick={exit}>
        <div
          className="box-pad-h-m sc-s slide-up"
          style={{
            position: "relative",
            overflow: "scroll",
            maxHeight: "90vh",
            width: "min(100%, 700px)",
            backgroundColor: "var(--white)",
            animationDelay: ".2s",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky fx-scattered fit-container fx-start-v ">
            <div
              className="fx-centered box-pad-h-m"
              style={{ paddingTop: ".5rem" }}
            >
              <UserProfilePicNOSTR
                size={40}
                mainAccountUser={false}
                ring={false}
                user_id={author.pubkey}
                img={author.picture}
              />
              <div>
                <p className="p-bold">{author.display_name || author.name}</p>
                <p className="p-medium gray-c">
                  @{author.name || author.display_name}
                </p>
              </div>
              <Follow
                size="small"
                toFollowKey={author.pubkey}
                toFollowName={""}
                bulkList={[]}
              />
            </div>
            <div className="box-pad-h-s box-pad-v-s">
              <div
                className="close"
                style={{ position: "static" }}
                onClick={exit}
              >
                <div></div>
              </div>
            </div>
          </div>

          <div className="article fit-container box-pad-h-m">
            {getVideoFromURL(content.url)}
          </div>
          <div className="fx-centered fx-col fx-start-h fx-start-v box-pad-h-m box-pad-v">
            <h4>{content.title}</h4>
            <p className="gray-c">{content.content}</p>
            {!content.content && (
              <p className="gray-c p-italic">No description.</p>
            )}
          </div>
        </div>
      </div>
    );
  return null;
}
