import React, { useContext, useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { Helmet } from "react-helmet";
import PagePlaceholder from "../../Components/PagePlaceholder";
import LoadingDots from "../../Components/LoadingDots";
import { useLocation } from "react-router-dom";
import { nip19, SimplePool } from "nostr-tools";
import { Context } from "../../Context/Context";
import {
  filterRelays,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import PreviewWidget from "../../Components/SmartWidget/PreviewWidget";
import Date_ from "../../Components/Date_";
import { validateWidgetValues } from "../../Helpers/Helpers";
import WidgetCard from "../../Components/NOSTR/WidgetCard";
const pool = new SimplePool();
const getNaddrParam = (location) => {
  let naddr = new URLSearchParams(location.search).get("naddr");
  return naddr || "";
};

export default function SmartWidgetChecker() {
  const location = useLocation();
  const { setToast, nostrUser } = useContext(Context);
  const naddrParam = getNaddrParam(location);
  const [widget, setWidget] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mbHide, setMbHide] = useState(true);
  const [naddr, setNaddr] = useState(naddrParam);
  const [componentTree, setComponentTree] = useState([]);

  const checkProperty = (key, value, type, extra) => {
    if (type === "video") {
      let checkKey = ["url"].includes(key);
      let checkValue = validateWidgetValues(value, key);
      let message = "Valid";
      let icon = "checkmark-tt";

      if (!checkValue) {
        message = "Invalid value";
        icon = "info-tt";
      }
      if (!checkKey) {
        message = "Unknown key";
        icon = "crossmark-tt";
      }
      return {
        icon,
        message,
      };
    }
    if (type === "image") {
      let checkKey = ["url", "aspect_ratio"].includes(key);
      let checkValue = validateWidgetValues(value, key);
      let message = "Valid";
      let icon = "checkmark-tt";

      if (!checkValue) {
        message = "Invalid value";
        icon = "info-tt";
      }
      if (!checkKey) {
        message = "Unknown key";
        icon = "crossmark-tt";
      }
      return {
        icon,
        message,
      };
    }
    if (type === "text") {
      let checkKey = ["content", "text_color", "weight", "size"].includes(key);
      let checkValue = validateWidgetValues(value, key);

      let message = "Valid";
      let icon = "checkmark-tt";

      if (!checkValue) {
        message = "Invalid value";
        icon = "info-tt";
      }
      if (!checkKey) {
        message = "Unknown key";
        icon = "crossmark-tt";
      }
      return {
        icon,
        message,
      };
    }
    if (type === "button") {
      let checkKey = [
        "content",
        "text_color",
        "url",
        "background_color",
        "type",
        "pubkey",
      ].includes(key);
      let checkValue = validateWidgetValues(
        value,
        key,
        key === "url" ? extra : ""
      );

      let message = "Valid";
      let icon = "checkmark-tt";

      if (!checkValue) {
        message = "Invalid value";
        icon = "info-tt";
      }
      if (!checkKey) {
        message = "Unknown key";
        icon = "crossmark-tt";
      }
      return {
        icon,
        message,
      };
    }
    if (type === "zap-poll") {
      let checkKey = [
        "content",
        "content_text_color",
        "options_text_color",
        "options_background_color",
        "options_foreground_color",
      ].includes(key);
      let checkValue = validateWidgetValues(value, key);

      let message = "Valid";
      let icon = "checkmark-tt";

      if (!checkValue) {
        message = "Invalid value";
        icon = "info-tt";
      }
      if (!checkKey) {
        message = "Unknown key";
        icon = "crossmark-tt";
      }
      return {
        icon,
        message,
      };
    }
    return {
      icon: "info-tt",
      message: "N/A type",
    };
  };
  const checkType = (type, value) => {
    let checkValue = ["video", "image", "text", "button", "zap-poll"].includes(
      value
    );
    let checkKey = type === "type";
    let message = "Valid";
    let icon = "checkmark-tt";

    if (!checkValue) {
      message = "Invalid value";
      icon = "info-tt";
    }
    if (!checkKey) {
      message = "Unknown key";
      icon = "crossmark-tt";
    }
    return {
      icon,
      message,
    };
  };

  const checkContainer = (key, value) => {
    let checkKey = ["layout", "division"].includes(key);
    let checkValue = validateWidgetValues(value, key);

    let message = "Valid";
    let icon = "checkmark-tt";

    if (!checkValue) {
      message = "Invalid value";
      icon = "info-tt";
    }
    if (!checkKey) {
      message = "Unknown key";
      icon = "crossmark-tt";
    }
    return {
      icon,
      message,
    };
  };
  const checkWidget = (key, value) => {
    let checkKey = ["border_color", "background_color"].includes(key);
    let checkValue = validateWidgetValues(value, key);

    let message = "Valid";
    let icon = "checkmark-tt";

    if (!checkValue) {
      message = "Invalid value";
      icon = "info-tt";
    }

    if (!checkKey) {
      message = "Unknown key";
      icon = "crossmark-tt";
    }
    return {
      icon,
      message,
    };
  };

  useEffect(() => {
    if (naddr) {
      try {
        setIsLoading(true);
        let parsedNaddr = nip19.decode(naddr);
        let relaysToUse = filterRelays(
          nostrUser?.relays || [],
          relaysOnPlatform
        );
        const { data } = parsedNaddr;
        let event_created_at = 0;
        const sub = pool.subscribeMany(
          relaysToUse,
          [
            {
              kinds: [30031],
              authors: [data.pubkey],
              "#d": [data.identifier],
            },
          ],
          {
            async onevent(event) {
              try {
                if (event.created_at > event_created_at) {
                  event_created_at = event.created_at;
                  let metadata = JSON.parse(event.content);
                  let parsedContent = getParsed3000xContent(event.tags);
                  setWidget({
                    ...parsedContent,
                    metadata,
                    metadataElements: Object.entries(metadata),
                    author: getEmptyNostrUser(event.pubkey),
                    ...event,
                  });
                  setComponentTree(
                    metadata.components?.map((cont) => {
                      let tempComp = { ...cont };
                      delete tempComp.left_side;
                      delete tempComp.right_side;
                      let container = Object.entries(tempComp);
                      let left_side = cont.left_side
                        ? cont.left_side?.map((comp) => {
                            return {
                              metadata: comp.metadata
                                ? Object.entries(comp.metadata)
                                : null,
                              properties: Object.entries(comp),
                            };
                          })
                        : null;
                      let right_side = cont.right_side
                        ? cont.right_side?.map((comp) => {
                            return {
                              metadata: comp.metadata
                                ? Object.entries(comp.metadata)
                                : null,
                              properties: Object.entries(comp),
                            };
                          })
                        : tempComp?.layout == 1
                        ? []
                        : null;

                      return {
                        container,
                        left_side,
                        right_side,
                      };
                    }) || []
                  );
                  setIsLoading(false);
                }
              } catch (err) {
                console.log(err);
                setIsLoading(false);
              }
            },
            oneose() {
              sub.close();
              pool.close(relaysToUse);
              setIsLoading(false);
            },
          }
        );
      } catch (err) {
        console.log(err);
        setToast({
          type: 2,
          desc: "Invalid naddr",
        });
        setIsLoading(false);
      }
    }
  }, [naddr]);

  const copyMetadata = () => {
    navigator?.clipboard?.writeText(JSON.stringify(widget.metadata));
    setToast({
      type: 1,
      desc: `Widget metadata was copied! 👏`,
    });
  };

  const clearPage = () => {
    setNaddr("");
    setWidget(false);
    setComponentTree([]);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Smart widget checker</title>
        <meta
          name="description"
          content={"Check the status of a smart widget"}
        />
        <meta
          property="og:description"
          content={"Check the status of a smart widget"}
        />
        <meta
          property="og:url"
          content={`https://yakihonne.com/smart-widget-checker`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Smart widget checker" />
        <meta
          property="twitter:title"
          content="Yakihonne | Smart widget checker"
        />
        <meta
          property="twitter:description"
          content={"Check the status of a smart widget"}
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <div className="fx-centered fit-container fx-start-h fx-start-v">
              <div className="box-pad-h-m fit-container">
                <div className="fit-container fx-centered fx-start-h fx-start-v">
                  <div
                    style={{ width: "min(100%,800px)", flex: 1.5 }}
                    className={` ${!mbHide ? "mb-hide-800" : ""}`}
                  >
                    <div className="fit-container fx-scattered sticky">
                      <div
                        className={`fx-centered fx-start-h if ifs-full ${
                          widget ? "if-disabled" : ""
                        }`}
                        style={{
                          gap: 0,
                          pointerEvents: widget ? "none" : "auto",
                        }}
                      >
                        <div className="search"></div>
                        <input
                          type="text"
                          className="if if-no-border ifs-full"
                          placeholder="Smart widget naddr"
                          disabled={isLoading}
                          value={naddr}
                          onChange={(e) => setNaddr(e.target.value)}
                        />
                      </div>
                      <div className="fx-centered">
                        {widget && (
                          <div
                            className="round-icon round-icon-tooltip"
                            disabled={isLoading}
                            onClick={clearPage}
                            data-tooltip="Clear search"
                          >
                            {isLoading ? (
                              <LoadingDots />
                            ) : (
                              <div className="trash"></div>
                            )}
                          </div>
                        )}
                        <div
                          className="round-icon desk-hide round-icon-tooltip"
                          data-tooltip="See layers"
                          onClick={() => setMbHide(false)}
                        >
                          <div className="curation"></div>
                        </div>
                      </div>
                    </div>
                    {!widget && <PagePlaceholder page={"widgets"} />}
                    {widget && (
                      <WidgetCard widget={widget} deleteWidget={null} />
                    )}
                  </div>
                  <div
                    style={{
                      height: "100vh",
                      backgroundColor: "var(--pale-gray)",
                      width: "1px",
                      position: "sticky",
                      top: 0,
                      margin: "0 .5rem",
                    }}
                    className="mb-hide-800"
                  ></div>
                  <div
                    style={{
                      width: "min(100%,500px)",
                      flex: 1,
                      height: "100vh",
                      overflow: "scroll",
                    }}
                    className={`box-pad-h-m box-pad-v sticky ${
                      mbHide ? "mb-hide-800" : ""
                    }`}
                  >
                    {widget && (
                      <>
                        <div className="fx-centered fx-start-h fit-container box-marg-s">
                          <div
                            className="round-icon desk-hide round-icon-tooltip"
                            onClick={() => setMbHide(true)}
                            data-tooltip="Back"
                          >
                            <div
                              className="arrow"
                              style={{ rotate: "90deg" }}
                            ></div>
                          </div>
                          <h4>Layers</h4>
                        </div>
                        <div className="fx-centered fx-col fit-container">
                          <p className="gray-c -medium fit-container p-left">
                            Metadata
                          </p>
                          <div
                            className="fit-container fx-col fx-centered fx-start-v box-pad-h-m box-pad-v-m sc-s-18"
                            style={{
                              borderRadius: "var(--border-r-6)",
                              backgroundColor: "var(--c1-side)",
                              overflow: "visible",
                            }}
                          >
                            <div className="fit-container fx-scattered fx-start-v">
                              <div className="fx-centered">
                                <p
                                  className="gray-c"
                                  style={{
                                    minWidth: "max-content",
                                  }}
                                >
                                  Title
                                </p>
                                <p>
                                  {widget.title || (
                                    <span className="orange-c p-medium">
                                      N/A
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="fx-centered fx-start-v">
                              <p
                                className="gray-c"
                                style={{
                                  minWidth: "max-content",
                                }}
                              >
                                Description
                              </p>
                              <p>
                                {widget.description || (
                                  <span className="orange-c p-medium">N/A</span>
                                )}
                              </p>
                            </div>
                            <div className="fx-centered">
                              <p
                                className="gray-c"
                                style={{
                                  minWidth: "max-content",
                                }}
                              >
                                Created at
                              </p>
                              <p>
                                <Date_
                                  toConvert={
                                    new Date(widget.published_at * 1000)
                                  }
                                  time={true}
                                />
                              </p>
                            </div>
                            <div className="fx-centered">
                              <p
                                className="gray-c"
                                style={{
                                  minWidth: "max-content",
                                }}
                              >
                                Identifier (#d)
                              </p>
                              <p>{widget.d}</p>
                            </div>
                          </div>
                          <div className="fit-container fx-scattered">
                            <p className="gray-c  p-left">Widget</p>
                            <div
                              className="round-icon-small"
                              onClick={copyMetadata}
                            >
                              <div className="copy"></div>
                            </div>
                          </div>
                          <div
                            className="fit-container fx-col fx-centered box-pad-h-m box-pad-v-m sc-s-18"
                            style={{
                              borderRadius: "var(--border-r-6)",
                              backgroundColor: "var(--c1-side)",
                              overflow: "visible",
                            }}
                          >
                            {widget.metadataElements.map(
                              (containerProps, containerPropsIndex) => {
                                let check = checkWidget(
                                  containerProps[0],
                                  containerProps[1]
                                );
                                if (containerProps[0] !== "components")
                                  return (
                                    <div
                                      className="fit-container fx-scattered"
                                      key={containerPropsIndex}
                                    >
                                      <div className="fx-centered">
                                        <p className="gray-c">
                                          {containerProps[0]}
                                        </p>
                                        <p>
                                          {containerProps[1] || (
                                            <span className="orange-c p-medium">
                                              N/A
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      <div
                                        className={`${check.icon} round-icon-tooltip`}
                                        data-tooltip={check.message}
                                      ></div>
                                    </div>
                                  );
                              }
                            )}
                            {widget.metadata.components &&
                              Array.isArray(widget.metadata.components) && (
                                <div className="fit-container fx-scattered">
                                  <div className="fx-centered">
                                    <p className="gray-c">
                                      components <sub>&#8628;</sub>
                                    </p>
                                  </div>
                                  <div
                                    className={`checkmark-tt round-icon-tooltip`}
                                    data-tooltip={"Valid"}
                                  ></div>
                                </div>
                              )}
                            {!(
                              widget.metadata.components &&
                              Array.isArray(widget.metadata.components)
                            ) && (
                              <div className="fit-container fx-scattered">
                                <div className="fx-centered">
                                  <p className="gray-c">components</p>
                                </div>
                                <div
                                  className={`info-tt round-icon-tooltip`}
                                  data-tooltip={"Invalid value"}
                                ></div>
                              </div>
                            )}
                            <div className="fit-container fx-centered fx-start-h fx-start-v">
                              <div style={{ width: "8px" }}></div>
                              <div className="fit-container fx-centered fx-col">
                                {componentTree.map(
                                  (container, containerIndex) => {
                                    return (
                                      <div
                                        className="fit-container fx-col fx-centered"
                                        style={{
                                          overflow: "visible",
                                          borderTop:
                                            "1px solid var(--dim-gray)",
                                          paddingTop: "1rem",
                                        }}
                                        key={containerIndex}
                                      >
                                        <div className="fit-container fx-centered fx-col fx-start-h fx-start-v">
                                          {container.container.map(
                                            (
                                              containerProps,
                                              containerPropsIndex
                                            ) => {
                                              let check = checkContainer(
                                                containerProps[0],
                                                containerProps[1]
                                              );
                                              return (
                                                <div
                                                  className="fit-container fx-scattered"
                                                  key={containerPropsIndex}
                                                >
                                                  <div className="fx-centered">
                                                    <p className="gray-c">
                                                      {containerProps[0]}
                                                    </p>
                                                    <p>
                                                      {containerProps[1] || (
                                                        <span className="orange-c p-medium">
                                                          N/A
                                                        </span>
                                                      )}
                                                    </p>
                                                  </div>
                                                  <div
                                                    className={`${check.icon} round-icon-tooltip`}
                                                    data-tooltip={check.message}
                                                  ></div>
                                                </div>
                                              );
                                            }
                                          )}
                                        </div>
                                        {container.left_side &&
                                          Array.isArray(
                                            container.left_side
                                          ) && (
                                            <div className="fit-container fx-scattered">
                                              <div className="fx-centered">
                                                <p className="gray-c">
                                                  left_side <sub>&#8628;</sub>
                                                </p>
                                              </div>
                                              <div
                                                className={`checkmark-tt round-icon-tooltip`}
                                                data-tooltip={"Valid"}
                                              ></div>
                                            </div>
                                          )}
                                        {!(
                                          container.left_side &&
                                          Array.isArray(container.left_side)
                                        ) && (
                                          <div className="fit-container fx-scattered">
                                            <div className="fx-centered">
                                              <p className="gray-c">
                                                left_side
                                              </p>
                                            </div>
                                            <div
                                              className={`info-tt round-icon-tooltip`}
                                              data-tooltip={"Invalid value"}
                                            ></div>
                                          </div>
                                        )}
                                        <div className="fit-container fx-centered fx-start-h fx-start-v">
                                          <div style={{ width: "8px" }}></div>
                                          <div className="fit-container">
                                            <div className="fx-centered fx-col fx-start-h fx-start-v">
                                              {container.left_side?.map(
                                                (compProps, compPropsIndex) => {
                                                  return (
                                                    <div
                                                      className="fit-container fx-scattered"
                                                      key={compPropsIndex}
                                                    >
                                                      <div
                                                        className="fit-container fx-col fx-centered"
                                                        style={{
                                                          borderRadius:
                                                            "var(--border-r-6)",
                                                          overflow: "visible",
                                                        }}
                                                      >
                                                        {compProps.properties.map(
                                                          (
                                                            InnerComProps,
                                                            InnerComPropsIndex
                                                          ) => {
                                                            let check =
                                                              checkType(
                                                                InnerComProps[0],
                                                                InnerComProps[1]
                                                              );
                                                            if (
                                                              InnerComProps[0] !==
                                                              "metadata"
                                                            )
                                                              return (
                                                                <div
                                                                  className="fit-container fx-scattered"
                                                                  key={
                                                                    InnerComPropsIndex
                                                                  }
                                                                >
                                                                  <div className="fx-centered">
                                                                    <p
                                                                      className="gray-c"
                                                                      style={{
                                                                        minWidth:
                                                                          "max-content",
                                                                      }}
                                                                    >
                                                                      {
                                                                        InnerComProps[0]
                                                                      }
                                                                    </p>
                                                                    <p className="p-one-line">
                                                                      {InnerComProps[1] || (
                                                                        <span className="orange-c p-medium">
                                                                          N/A
                                                                        </span>
                                                                      )}
                                                                    </p>
                                                                  </div>
                                                                  <div
                                                                    className={`${check.icon} round-icon-tooltip`}
                                                                    data-tooltip={
                                                                      check.message
                                                                    }
                                                                  ></div>
                                                                </div>
                                                              );
                                                          }
                                                        )}
                                                        {compProps.metadata &&
                                                          typeof compProps.metadata ===
                                                            "object" && (
                                                            <div className="fit-container fx-scattered">
                                                              <div className="fx-centered">
                                                                <p className="gray-c">
                                                                  metadata{" "}
                                                                  <sub>
                                                                    &#8628;
                                                                  </sub>
                                                                </p>
                                                              </div>
                                                              <div
                                                                className={`checkmark-tt round-icon-tooltip`}
                                                                data-tooltip={
                                                                  "Valid"
                                                                }
                                                              ></div>
                                                            </div>
                                                          )}
                                                        {!(
                                                          compProps.metadata &&
                                                          typeof compProps.metadata ===
                                                            "object"
                                                        ) && (
                                                          <div className="fit-container fx-scattered">
                                                            <div className="fx-centered">
                                                              <p className="gray-c">
                                                                metadata
                                                              </p>
                                                            </div>
                                                            <div
                                                              className={`info-tt round-icon-tooltip`}
                                                              data-tooltip={
                                                                "Invalid value"
                                                              }
                                                            ></div>
                                                          </div>
                                                        )}
                                                        {compProps.metadata
                                                          ?.length > 0 && (
                                                          <div className="fit-container fx-centered fx-start-h fx-start-v">
                                                            <div
                                                              style={{
                                                                width: "8px",
                                                              }}
                                                            ></div>
                                                            <div
                                                              className="fit-container fx-col fx-centered"
                                                              style={{
                                                                borderRadius:
                                                                  "var(--border-r-6)",
                                                                overflow:
                                                                  "visible",
                                                              }}
                                                            >
                                                              {compProps.metadata?.map(
                                                                (
                                                                  InnerComProps,
                                                                  InnerComPropsIndex
                                                                ) => {
                                                                  let type =
                                                                    compProps.properties.find(
                                                                      (el) =>
                                                                        el[0] ===
                                                                        "type"
                                                                    );
                                                                  let buttonType =
                                                                    compProps.metadata.find(
                                                                      (el) =>
                                                                        el[0] ===
                                                                        "type"
                                                                    );

                                                                  let check =
                                                                    checkProperty(
                                                                      InnerComProps[0],
                                                                      InnerComProps[1],
                                                                      type
                                                                        ? type[1]
                                                                        : "",
                                                                      buttonType
                                                                        ? buttonType[1]
                                                                        : ""
                                                                    );
                                                                  if (
                                                                    InnerComProps[0] !==
                                                                    "metadata"
                                                                  )
                                                                    return (
                                                                      <div
                                                                        className="fit-container fx-scattered"
                                                                        key={
                                                                          InnerComPropsIndex
                                                                        }
                                                                      >
                                                                        <div className="fx-centered">
                                                                          <p
                                                                            className="gray-c"
                                                                            style={{
                                                                              minWidth:
                                                                                "max-content",
                                                                            }}
                                                                          >
                                                                            {
                                                                              InnerComProps[0]
                                                                            }
                                                                          </p>
                                                                          <p className="p-one-line">
                                                                            {InnerComProps[1] || (
                                                                              <span className="orange-c p-medium">
                                                                                N/A
                                                                              </span>
                                                                            )}
                                                                          </p>
                                                                        </div>
                                                                        <div
                                                                          className={`${check.icon} round-icon-tooltip`}
                                                                          data-tooltip={
                                                                            check.message
                                                                          }
                                                                        ></div>
                                                                      </div>
                                                                    );
                                                                }
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {container.right_side &&
                                          Array.isArray(
                                            container.right_side
                                          ) && (
                                            <div className="fit-container fx-scattered">
                                              <div className="fx-centered">
                                                <p className="gray-c">
                                                  right_side <sub>&#8628;</sub>
                                                </p>
                                              </div>
                                              <div
                                                className={`checkmark-tt round-icon-tooltip`}
                                                data-tooltip={"Valid"}
                                              ></div>
                                            </div>
                                          )}
                                        {!(
                                          container.right_side &&
                                          Array.isArray(container.right_side)
                                        ) && (
                                          <div className="fit-container fx-scattered">
                                            <div className="fx-centered">
                                              <p className="gray-c">
                                                right_side
                                              </p>
                                            </div>
                                            <div
                                              className={`info-tt round-icon-tooltip`}
                                              data-tooltip={"Invalid value"}
                                            ></div>
                                          </div>
                                        )}
                                        <div className="fit-container fx-centered fx-start-h fx-start-v">
                                          <div style={{ width: "8px" }}></div>
                                          <div className="fit-container">
                                            <div className="fx-centered fx-col fx-start-h fx-start-v">
                                              {container.right_side?.map(
                                                (compProps, compPropsIndex) => {
                                                  return (
                                                    <div
                                                      className="fit-container fx-scattered"
                                                      key={compPropsIndex}
                                                    >
                                                      <div
                                                        className="fit-container fx-col fx-centered"
                                                        style={{
                                                          borderRadius:
                                                            "var(--border-r-6)",
                                                          overflow: "visible",
                                                        }}
                                                      >
                                                        {compProps.properties.map(
                                                          (
                                                            InnerComProps,
                                                            InnerComPropsIndex
                                                          ) => {
                                                            let check =
                                                              checkType(
                                                                InnerComProps[0],
                                                                InnerComProps[1]
                                                              );
                                                            if (
                                                              InnerComProps[0] !==
                                                              "metadata"
                                                            )
                                                              return (
                                                                <div
                                                                  className="fit-container fx-scattered"
                                                                  key={
                                                                    InnerComPropsIndex
                                                                  }
                                                                >
                                                                  <div className="fx-centered">
                                                                    <p
                                                                      className="gray-c"
                                                                      style={{
                                                                        minWidth:
                                                                          "max-content",
                                                                      }}
                                                                    >
                                                                      {
                                                                        InnerComProps[0]
                                                                      }
                                                                    </p>
                                                                    <p className="p-one-line">
                                                                      {InnerComProps[1] || (
                                                                        <span className="orange-c p-medium">
                                                                          N/A
                                                                        </span>
                                                                      )}
                                                                    </p>
                                                                  </div>
                                                                  <div
                                                                    className={`${check.icon} round-icon-tooltip`}
                                                                    data-tooltip={
                                                                      check.message
                                                                    }
                                                                  ></div>
                                                                </div>
                                                              );
                                                          }
                                                        )}
                                                        {compProps.metadata &&
                                                          typeof compProps.metadata ===
                                                            "object" && (
                                                            <div className="fit-container fx-scattered">
                                                              <div className="fx-centered">
                                                                <p className="gray-c">
                                                                  metadata{" "}
                                                                  <sub>
                                                                    &#8628;
                                                                  </sub>
                                                                </p>
                                                              </div>
                                                              <div
                                                                className={`checkmark-tt round-icon-tooltip`}
                                                                data-tooltip={
                                                                  "Valid"
                                                                }
                                                              ></div>
                                                            </div>
                                                          )}
                                                        {!(
                                                          compProps.metadata &&
                                                          typeof compProps.metadata ===
                                                            "object"
                                                        ) && (
                                                          <div className="fit-container fx-scattered">
                                                            <div className="fx-centered">
                                                              <p className="gray-c">
                                                                metadata
                                                              </p>
                                                            </div>
                                                            <div
                                                              className={`info-tt round-icon-tooltip`}
                                                              data-tooltip={
                                                                "Invalid value"
                                                              }
                                                            ></div>
                                                          </div>
                                                        )}
                                                        {compProps.metadata
                                                          ?.length > 0 && (
                                                          <div className="fit-container fx-centered fx-start-h fx-start-v">
                                                            <div
                                                              style={{
                                                                width: "8px",
                                                              }}
                                                            ></div>
                                                            <div
                                                              className="fit-container fx-col fx-centered"
                                                              style={{
                                                                borderRadius:
                                                                  "var(--border-r-6)",
                                                                overflow:
                                                                  "visible",
                                                              }}
                                                            >
                                                              {compProps.metadata?.map(
                                                                (
                                                                  InnerComProps,
                                                                  InnerComPropsIndex
                                                                ) => {
                                                                  let type =
                                                                    compProps.properties.find(
                                                                      (el) =>
                                                                        el[0] ===
                                                                        "type"
                                                                    );
                                                                  let buttonType =
                                                                    compProps.metadata.find(
                                                                      (el) =>
                                                                        el[0] ===
                                                                        "type"
                                                                    );
                                                                  let check =
                                                                    checkProperty(
                                                                      InnerComProps[0],
                                                                      InnerComProps[1],
                                                                      type
                                                                        ? type[1]
                                                                        : "",
                                                                      buttonType
                                                                        ? buttonType[1]
                                                                        : ""
                                                                    );
                                                                  if (
                                                                    InnerComProps[0] !==
                                                                    "metadata"
                                                                  )
                                                                    return (
                                                                      <div
                                                                        className="fit-container fx-scattered"
                                                                        key={
                                                                          InnerComPropsIndex
                                                                        }
                                                                      >
                                                                        <div className="fx-centered">
                                                                          <p
                                                                            className="gray-c"
                                                                            style={{
                                                                              minWidth:
                                                                                "max-content",
                                                                            }}
                                                                          >
                                                                            {
                                                                              InnerComProps[0]
                                                                            }
                                                                          </p>
                                                                          <p className="p-one-line">
                                                                            {InnerComProps[1] || (
                                                                              <span className="orange-c p-medium">
                                                                                N/A
                                                                              </span>
                                                                            )}
                                                                          </p>
                                                                        </div>
                                                                        <div
                                                                          className={`${check.icon} round-icon-tooltip`}
                                                                          data-tooltip={
                                                                            check.message
                                                                          }
                                                                        ></div>
                                                                      </div>
                                                                    );
                                                                }
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
