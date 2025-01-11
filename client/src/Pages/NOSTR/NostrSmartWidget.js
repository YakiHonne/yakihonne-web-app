import React, { useContext, useEffect, useRef, useState } from "react";
import { Context } from "../../Context/Context";
import { finalizeEvent, nip19, SimplePool } from "nostr-tools";
import Lottie from "lottie-react";
import { Helmet } from "react-helmet";
import { nanoid } from "nanoid";
import PagePlaceholder from "../../Components/PagePlaceholder";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import UploadFile from "../../Components/UploadFile";
import ZapPollsComp from "../../Components/SmartWidget/ZapPollsComp";
import AddPoll from "../../Components/NOSTR/AddPoll";
import relaysOnPlatform from "../../Content/Relays";
import {
  decodeBolt11,
  filterRelays,
  getEmptyNostrUser,
  getParsed3000xContent,
} from "../../Helpers/Encryptions";
import BrowsePolls from "../../Components/NOSTR/BrowsePolls";
import widget from "../../media/JSONs/widgets.json";
import PreviewContainer from "../../Components/SmartWidget/PreviewContainer";
import VideoComp from "../../Components/SmartWidget/VideoComp";
import ImgComp from "../../Components/SmartWidget/ImgComp";
import TextComp from "../../Components/SmartWidget/TextComp";
import ButtonComp from "../../Components/SmartWidget/ButtonComp";
import { useLocation, useNavigate } from "react-router-dom";
import LoadingDots from "../../Components/LoadingDots";
import swTemplates from "../../Content/SmartWidgetTemplates";
import PreviewWidget from "../../Components/SmartWidget/PreviewWidget";
import Select from "../../Components/NOSTR/Select";
import Date_ from "../../Components/Date_";
import OptionsDropdown from "../../Components/NOSTR/OptionsDropdown";
import UserSearchBar from "../../Components/UserSearchBar";
import NProfilePreviewer from "../../Components/NOSTR/NProfilePreviewer";
import PostNoteWithWidget from "../../Components/NOSTR/PostNoteWithWidget";

const pool = new SimplePool();

const getTypeMetada = (type, isDarkMode) => {
  let text_color = isDarkMode === "0" ? "#ffffff" : "#1C1B1F";
  let background_color = isDarkMode === "0" ? "#2f2f2f" : "#e5e5e5";
  if (type === "video")
    return {
      url: "",
    };
  if (type === "image")
    return {
      url: "",
      aspect_ratio: "16:9",
    };
  if (type === "text")
    return {
      content: "Lorem ipsum",
      text_color,
      weight: "",
      size: "regular",
    };
  if (type === "button")
    return {
      content: "Button",
      text_color: "",
      url: "",
      pubkey: "",
      background_color: "",
      type: "regular",
    };
  if (type === "zap-poll")
    return {
      content: "",
      content_text_color: text_color,
      options_text_color: "#ffffff",
      options_background_color: background_color,
      options_foreground_color: "#ee7700",
    };
};

const getNostrKeys = () => {
  let nostrKeys = localStorage.getItem("_nostruserkeys");
  try {
    nostrKeys = nostrKeys ? JSON.parse(nostrKeys) : false;
    return nostrKeys;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const getTemplate = (template) => {
  if (!(template && Array.isArray(template))) return [];
  return template.map((container) => {
    let left_side =
      container.left_side && Array.isArray(container.left_side)
        ? container.left_side.map((component) => {
            if (component.type === "zap-poll") {
              let nevent = nip19.neventEncode({
                id: JSON.parse(component.metadata.content).id,
              });
              return {
                ...component,
                id: nanoid(),
                metadata: { ...component.metadata, nevent },
              };
            }
            return { ...component, id: nanoid() };
          })
        : [];
    let right_side =
      container.right_side && Array.isArray(container.right_side)
        ? container.right_side.map((component) => {
            return { ...component, id: nanoid() };
          })
        : [];
    return { ...container, left_side, right_side, id: nanoid() };
  });
};

const buttonTypes = [
  {
    display_name: "Regular",
    value: "regular",
  },
  {
    display_name: "Zap",
    value: "zap",
  },
  {
    display_name: "NOSTR",
    value: "nostr",
  },
  {
    display_name: "Youtube",
    value: "youtube",
  },
  {
    display_name: "Telegram",
    value: "telegram",
  },
  {
    display_name: "Discord",
    value: "discord",
  },
  {
    display_name: "X",
    value: "x",
  },
];

const textSizes = [
  {
    display_name: "H1",
    value: "h1",
  },
  {
    display_name: "H2",
    value: "h2",
  },
  {
    display_name: "Regular body",
    value: "regular",
  },
  {
    display_name: "Small body",
    value: "small",
  },
];

const textWeights = [
  {
    display_name: "Regular",
    value: "regular",
  },
  {
    display_name: "Bold",
    value: "bold",
  },
];

const imageAspectRatio = [
  {
    display_name: "16:9",
    value: "16:9",
  },
  {
    display_name: "1:1",
    value: "1:1",
  },
];

export default function NostrSmartWidget() {
  let { state } = useLocation();
  let nostrKeys = getNostrKeys();
  const { isDarkMode } = useContext(Context);
  const [buildOptions, setBuildOptions] = useState(state ? false : true);
  const [buildOption, setBuildOption] = useState("normal");
  const [template, setTemplate] = useState(
    state ? getTemplate(state.metadata.metadata.components) : []
  );
  const [containerBorderColor, setContainerBorderColor] = useState(
    state ? state.metadata.metadata.border_color : ""
  );
  const [containerBackgroundColor, setContainerBackgroundColor] = useState(
    state
      ? state.metadata.metadata.background_color
      : isDarkMode === "0"
      ? "#252429"
      : "#F7F7F7"
  );
  const [postingOption, setPostingOption] = useState(state ? state.ops : "");
  const [triggerPublish, setTriggerPublish] = useState(false);
  const [widgetID, setWidgetID] = useState(
    state ? state?.metadata?.d : nanoid()
  );

  useEffect(() => {
    console.log(isDarkMode, containerBackgroundColor);
    if (isDarkMode === "1" && containerBackgroundColor === "#252429") {
      setContainerBackgroundColor("#F7F7F7");
    }
    if (isDarkMode === "0" && containerBackgroundColor === "#F7F7F7") {
      setContainerBackgroundColor("#252429");
    }
  }, [isDarkMode]);

  const handleSelectTemplate = (comps) => {
    setTemplate(getTemplate(comps));
    setBuildOption("normal");
    setBuildOptions(false);
  };

  const handleSelectDraft = (draft, publish) => {
    setWidgetID(draft.id);
    setContainerBackgroundColor(draft.background_color);
    setContainerBorderColor(draft.border_color);
    handleSelectTemplate(draft.components);
    if (publish) setTriggerPublish(true);
  };

  return (
    <div>
      <Helmet>
        <title>Yakihonne | Smart widget builder</title>
        <meta
          name="description"
          content={"Your portal for building your smart widget"}
        />
        <meta
          property="og:description"
          content={"Your portal for building your smart widget"}
        />

        <meta
          property="og:url"
          content={`https://yakihonne.com/smart-widget`}
        />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Yakihonne" />
        <meta property="og:title" content="Yakihonne | Smart widget builder" />
        <meta
          property="twitter:title"
          content="Yakihonne | Smart widget builder"
        />
        <meta
          property="twitter:description"
          content={"Your portal for building your smart widget"}
        />
      </Helmet>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <div className="fx-centered fit-container fx-start-h fx-start-v">
              <div className="box-pad-h-m fit-container">
                {nostrKeys && (
                  <>
                    {(nostrKeys.sec || nostrKeys.ext) && (
                      <>
                        {buildOptions && (
                          <>
                            {buildOption === "normal" && (
                              <BuildOptions
                                setTemplate={(data, newID) => {
                                  setBuildOptions(false);
                                  setTemplate(data);
                                  newID && setWidgetID(nanoid());
                                }}
                                template={template}
                                setBuildOption={(option) =>
                                  setBuildOption(option)
                                }
                                back={() => setBuildOptions(false)}
                              />
                            )}
                            {buildOption === "template" && (
                              <SWTemplates
                                setBuildOption={() => setBuildOption("normal")}
                                setTemplate={handleSelectTemplate}
                              />
                            )}
                            {buildOption === "drafts" && (
                              <SWDrafts
                                back={setBuildOption}
                                setTemplate={handleSelectDraft}
                              />
                            )}
                          </>
                        )}
                        {!buildOptions && (
                          <SmartWidgetBuilder
                            template={template}
                            back={(data) => {
                              setBuildOptions(true);
                              setTemplate(data);
                            }}
                            containerBorderColor={containerBorderColor}
                            containerBackgroundColor={containerBackgroundColor}
                            postingOption={postingOption}
                            widget={state ? state.metadata : null}
                            widgetID={widgetID}
                            triggerPublish={triggerPublish}
                          />
                        )}
                      </>
                    )}

                    {!nostrKeys.sec && !nostrKeys.ext && (
                      <PagePlaceholder page={"nostr-unauthorized"} />
                    )}
                  </>
                )}
                {!nostrKeys && <PagePlaceholder page={"nostr-not-connected"} />}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const BuildOptions = ({ setTemplate, template, back, setBuildOption }) => {
  return (
    <div
      className="fit-container fit-height fx-scattered "
      style={{ height: "100vh" }}
    >
      <div></div>
      <div style={{ width: "550px" }} className="fx-centered fx-col">
        <div style={{ width: "350px" }} className="fx-centered">
          <Lottie animationData={widget} loop={true} />
        </div>
        <div className="fx-centered fx-col">
          <h3 className="p-centered">Smart widget builder</h3>
          <p className="gray-c p-centered">
            Start building and customize your smart widget to use on Nostr
            network
          </p>
        </div>
        <div
          className="fit-container fx-centered box-pad-v"
          style={{ columnGap: "16px" }}
        >
          <div
            className="fx fx-centered fx-col sc-s-18 option pointer"
            style={{ height: "200px" }}
            onClick={() => setTemplate([], true)}
          >
            <div className="round-icon">
              <div className="plus-sign"></div>
            </div>
            <p className="gray-c">Blank widget</p>
          </div>
          <div
            className="fx fx-centered fx-col sc-s-18 option pointer"
            style={{ height: "200px" }}
            onClick={() => setBuildOption("drafts")}
          >
            <div
              className="smart-widget-draft"
              style={{ minWidth: "36px", height: "64px" }}
            ></div>
            <p className="gray-c">My drafts</p>
          </div>
          <div
            className="fx fx-centered fx-col sc-s-18 option pointer"
            style={{ height: "200px" }}
            onClick={() => setBuildOption("template")}
          >
            <div
              className="frames"
              style={{ minWidth: "36px", height: "64px" }}
            ></div>
            <p className="gray-c">Templates</p>
          </div>
        </div>
        {template.length > 0 && (
          <div className="fx-centered pointer" onClick={back}>
            <div
              className="round-icon-small roun-icon-tooltip"
              data-tooltip="Change plan"
            >
              <div className="arrow" style={{ rotate: "90deg" }}></div>
            </div>
            <p className="orange-c">Resume work</p>
          </div>
        )}
      </div>
      <div className="desk-hide"></div>
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
    </div>
  );
};

const SmartWidgetBuilder = ({
  back,
  template,
  containerBorderColor,
  containerBackgroundColor,
  postingOption,
  widget,
  widgetID,
  triggerPublish,
}) => {
  const { nostrKeys, nostrUser, setToast, setToPublish, isDarkMode } =
    useContext(Context);
  const navigateTo = useNavigate();
  const [showComponents, setShowComponents] = useState(false);
  const [componentsTree, setComponentsTree] = useState(
    template.length > 0
      ? template
      : [
          {
            id: nanoid(),
            layout: 1,
            division: "1:1",
            left_side: [],
            right_side: [],
          },
        ]
  );
  const [selectedLayer, setSelectedLayer] = useState(false);
  const [mainContainerBorderColor, setMainContainerBorderColor] =
    useState(containerBorderColor);
  const [mainContainerBackgroundColor, setMainContainerBackgroundColor] =
    useState(containerBackgroundColor);
  const [selectedContainer, setSelectedContainer] = useState(componentsTree[0]);
  const [preview, setPreview] = useState(false);
  const [showFinalStep, setShowFinalStep] = useState(triggerPublish);
  const [lastDesgin, setLastDesign] = useState(
    localStorage.getItem("sw-current-workspace")
  );
  const [mbHide, setMbHide] = useState(true);
  const [widgetToPostInNote, setWidgetToPostInNote] = useState(false);

  const checkContent = () => {
    return !(
      componentsTree.length === 1 &&
      componentsTree[0].left_side.length === 0 &&
      componentsTree[0].right_side &&
      componentsTree[0].right_side.length === 0
    );
  };
  const isThereContent = checkContent();
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const repaintComponents = (option) => {
    let text_color = option === "dark" ? "#ffffff" : "#1C1B1F";
    let background_color = option === "dark" ? "#2f2f2f" : "#e5e5e5";
    if (option === "dark") {
      let tempTemplate = Array.from(componentsTree);
      tempTemplate = tempTemplate.map((container) => {
        let left_side = container.left_side.map((comp) => {
          if (comp.type === "text" && comp.metadata.text_color === "#1C1B1F") {
            return {
              ...comp,
              metadata: {
                ...comp.metadata,
                text_color,
              },
            };
          }
          if (comp.type === "zap-poll") {
            const tempMetadata = { ...comp.metadata };
            if (tempMetadata.content_text_color === "#1C1B1F")
              tempMetadata.content_text_color = text_color;
            if (tempMetadata.options_background_color === "#e5e5e5")
              tempMetadata.options_background_color = background_color;

            return {
              ...comp,
              metadata: {
                ...tempMetadata,
              },
            };
          }
          return comp;
        });
        let right_side = container.right_side.map((comp) => {
          if (comp.type === "text" && comp.metadata.text_color === "#1C1B1F") {
            return {
              ...comp,
              metadata: {
                ...comp.metadata,
                text_color,
              },
            };
          }
          return comp;
        });

        return {
          ...container,
          left_side,
          right_side,
        };
      });
      return tempTemplate;
    }
    if (option === "light") {
      let tempTemplate = Array.from(componentsTree);
      tempTemplate = tempTemplate.map((container) => {
        let left_side = container.left_side.map((comp) => {
          if (comp.type === "text" && comp.metadata.text_color === "#ffffff") {
            return {
              ...comp,
              metadata: {
                ...comp.metadata,
                text_color,
              },
            };
          }
          if (comp.type === "zap-poll") {
            const tempMetadata = { ...comp.metadata };
            if (tempMetadata.content_text_color === "#ffffff")
              tempMetadata.content_text_color = text_color;
            if (tempMetadata.options_background_color === "#2f2f2f")
              tempMetadata.options_background_color = background_color;

            return {
              ...comp,
              metadata: {
                ...tempMetadata,
              },
            };
          }
          return comp;
        });
        let right_side = container.right_side.map((comp) => {
          if (comp.type === "text" && comp.metadata.text_color === "#ffffff") {
            return {
              ...comp,
              metadata: {
                ...comp.metadata,
                text_color,
              },
            };
          }
          return comp;
        });

        return {
          ...container,
          left_side,
          right_side,
        };
      });
      return tempTemplate;
    }

    return [];
  };

  useEffect(() => {
    if (isDarkMode === "1" && mainContainerBackgroundColor === "#252429") {
      let tempComponent = repaintComponents("light");
      setComponentsTree(tempComponent);
      setMainContainerBackgroundColor("#F7F7F7");
    }
    if (isDarkMode === "0" && mainContainerBackgroundColor === "#F7F7F7") {
      let tempComponent = repaintComponents("dark");
      setComponentsTree(tempComponent);
      setMainContainerBackgroundColor("#252429");
    }
  }, [containerBackgroundColor]);

  useEffect(() => {
    let sw = {
      id: widgetID,
      last_updated: Math.floor(Date.now() / 1000),
      background_color: mainContainerBackgroundColor,
      border_color: mainContainerBorderColor,
      components: componentsTree,
    };
    localStorage.setItem("sw-current-workspace", JSON.stringify(sw));

    let workspaces = localStorage.getItem("sw-workspaces");
    if (workspaces) {
      try {
        workspaces = JSON.parse(workspaces);
        if (Array.isArray(workspaces)) {
          let index = workspaces.findIndex(
            (workspace) => workspace.id === widgetID
          );
          if (index !== -1) {
            workspaces[index] = sw;
            localStorage.setItem("sw-workspaces", JSON.stringify(workspaces));
          } else {
            workspaces.unshift(sw);
            localStorage.setItem("sw-workspaces", JSON.stringify(workspaces));
          }
        } else {
          localStorage.setItem("sw-workspaces", JSON.stringify([sw]));
        }
      } catch (err) {
        console.log(err);
        localStorage.setItem("sw-workspaces", JSON.stringify([sw]));
      }
    } else {
      localStorage.setItem("sw-workspaces", JSON.stringify([sw]));
    }
  }, [componentsTree, mainContainerBorderColor, mainContainerBackgroundColor]);

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

  const loadLastDesign = () => {
    if (lastDesgin) {
      try {
        let parsedSW = JSON.parse(lastDesgin);
        setMainContainerBackgroundColor(parsedSW.background_color);
        setMainContainerBorderColor(parsedSW.border_color);
        setComponentsTree(parsedSW.components);
        setLastDesign(false);
      } catch (err) {
        console.log(err);
      }
    }
  };

  const handleAddComponent = (type) => {
    let tempArray = Array.from(componentsTree);
    let index = tempArray.findIndex(
      (comp) => comp?.id === selectedContainer.id
    );
    if (index !== -1) {
      let tempId = nanoid();
      let tempComp = {
        id: tempId,
        type,
        metadata: getTypeMetada(type, isDarkMode),
      };
      if (selectedContainer.side === "left")
        tempArray[index].left_side.push(tempComp);
      if (selectedContainer.side === "right")
        tempArray[index].right_side.push(tempComp);
      setSelectedLayer(tempComp);
      setComponentsTree(tempArray);
    }
  };
  const handleAddContainer = (containerId) => {
    let tempArray = Array.from(componentsTree);
    let index = tempArray.findIndex((comp) => comp?.id === containerId);
    if (index !== -1) {
      let newContainer = {
        id: nanoid(),
        layout: 1,
        division: "1:1",
        left_side: [],
        right_side: [],
      };
      if (index + 1 !== tempArray.length) {
        if (
          tempArray[index + 1].left_side.length === 0 &&
          tempArray[index + 1].right_side.length === 0
        )
          return;
      }
      tempArray.splice(index + 1, 0, newContainer);
      setComponentsTree(tempArray);
      setSelectedContainer(newContainer);
      setSelectedLayer(false);
    }
  };
  const handleSelectedLayerMetadata = (metadata) => {
    let tempArray = Array.from(componentsTree);
    let index = tempArray.findIndex(
      (comp) => comp?.id === selectedContainer.id
    );
    if (index !== -1) {
      let index_left = tempArray[index].left_side.findIndex(
        (comp_) => comp_.id === metadata.id
      );
      let index_right = tempArray[index].right_side.findIndex(
        (comp_) => comp_.id === metadata.id
      );
      if (index_left !== -1) tempArray[index].left_side[index_left] = metadata;
      if (index_right !== -1)
        tempArray[index].right_side[index_right] = metadata;
      setSelectedLayer(metadata);
      setComponentsTree(tempArray);
    }
  };
  const handleDeleteContainer = (index) => {
    let tempArray = Array.from(componentsTree);
    if (tempArray[index].id === selectedContainer.id) {
      setSelectedContainer(false);
      setSelectedLayer(false);
    }
    tempArray.splice(index, 1);
    setComponentsTree(tempArray);
  };
  const handleDeleteComponent = (containerIndex, componentIndex, side) => {
    let tempArray = Array.from(componentsTree);

    if (side === "left") {
      if (
        tempArray[containerIndex].left_side[componentIndex].id === selectedLayer
      )
        setSelectedLayer(false);
      tempArray[containerIndex].left_side.splice(componentIndex, 1);
    }
    if (side === "right") {
      if (
        tempArray[containerIndex].right_side[componentIndex].id ===
        selectedLayer
      )
        setSelectedLayer(false);
      tempArray[containerIndex].right_side.splice(componentIndex, 1);
    }
    setComponentsTree(tempArray);
  };
  const handleContainerOps = (opsKind, metadata) => {
    let changeSection = () => {
      let tempArray = Array.from(componentsTree);
      let index = tempArray.findIndex((comp) => comp?.id === metadata.id);
      let layout = metadata.layout || 1;
      let division = metadata.division || "1:1";

      if (index !== -1) {
        tempArray[index].layout = layout;
        tempArray[index].division = division;
        if (
          layout == 1 &&
          tempArray[index].left_side.length === 0 &&
          tempArray[index].right_side.length > 0
        ) {
          tempArray[index].left_side = tempArray[index].right_side;
          tempArray[index].right_side = [];
        }
        setComponentsTree(tempArray);
      }
    };
    let moveUp = () => {
      let tempArray = Array.from(componentsTree);
      let tempPrevEl = tempArray[metadata.index - 1];
      let tempCurrentEl = tempArray[metadata.index];

      tempArray[metadata.index] = tempPrevEl;
      tempArray[metadata.index - 1] = tempCurrentEl;
      setComponentsTree(tempArray);
    };
    let moveDown = () => {
      let tempArray = Array.from(componentsTree);
      let tempNextEl = tempArray[metadata.index + 1];
      let tempCurrentEl = tempArray[metadata.index];

      tempArray[metadata.index] = tempNextEl;
      tempArray[metadata.index + 1] = tempCurrentEl;
      setComponentsTree(tempArray);
    };
    let switchSections = () => {
      let tempArray = Array.from(componentsTree);
      let right_side = tempArray[metadata.index].right_side;
      let left_side = tempArray[metadata.index].left_side;

      tempArray[metadata.index].right_side = left_side;
      tempArray[metadata.index].left_side = right_side;

      setComponentsTree(tempArray);
    };

    let emptyContainer = () => {
      let tempArray = Array.from(componentsTree);
      let index = tempArray.findIndex((comp) => comp?.id === metadata.id);
      if (index !== -1) {
        tempArray[index].right_side = [];
        tempArray[index].left_side = [];
        tempArray[index].layout = 1;
        tempArray[index].division = "1:1";
        setComponentsTree(tempArray);
      }
    };

    if (opsKind === "empty container") {
      emptyContainer();
      return;
    }
    if (opsKind === "change section") {
      changeSection();
      return;
    }
    if (opsKind === "move up") {
      moveUp();
      return;
    }
    if (opsKind === "move down") {
      moveDown();
      return;
    }
    if (opsKind === "switch sections") {
      switchSections();
      return;
    }
    if (opsKind === "delete") {
      handleDeleteContainer(metadata.index);
      return;
    }
  };
  const checkMonoLayer = () => {
    let tempArray = Array.from(componentsTree);
    let index = tempArray.findIndex(
      (comp) => comp?.id === selectedContainer.id
    );
    if (index !== -1) {
      if (tempArray[index].layout === 1) return true;
      return false;
    }
    return true;
  };
  const handleBack = () => {
    if (componentsTree.length === 0) {
      back([]);
      return;
    }
    if (
      componentsTree.length > 1 ||
      componentsTree[0].right_side?.length > 0 ||
      componentsTree[0].left_side?.length > 0
    ) {
      back(componentsTree);
      return;
    }
    back([]);
  };
  const handlShowFinalStep = () => {
    let content = componentsTree.filter(
      (component) =>
        component.left_side.length > 0 || component.right_side.length > 0
    );

    if (content.length === 0) {
      setToast({
        type: 3,
        desc: "The smart widget should have at least one component",
      });
      return;
    }

    setShowFinalStep(true);
  };
  const postWidget = async (title, summary) => {
    let created_at = Math.floor(Date.now() / 1000);
    let relaysToPublish = nostrUser
      ? filterRelays(relaysOnPlatform, nostrUser?.relays || [])
      : relaysOnPlatform;
    let tags;
    if (!title) {
      setToast({
        type: 3,
        desc: "You need to have a title to your widget",
      });
      setIsLoading(false);
      return;
    }

    if (!postingOption || postingOption === "clone")
      tags = [
        ["d", nanoid()],
        [
          "client",
          "Yakihonne",
          "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
        ],
        ["published_at", `${created_at}`],
        ["title", title],
        ["summary", summary],
      ];

    if (postingOption === "edit")
      tags = [
        ["d", widget.d],
        [
          "client",
          "Yakihonne",
          "31990:20986fb83e775d96d188ca5c9df10ce6d613e0eb7e5768a0f0b12b37cdac21b3:1700732875747",
        ],
        ["published_at", widget.published_at],
        ["title", title],
        ["summary", summary],
      ];

    let content = componentsTree.filter(
      (component) =>
        component.left_side.length > 0 || component.right_side.length > 0
    );

    if (content.length === 0) {
      setToast({
        type: 3,
        desc: "The smart widget should have at least one component",
      });
      setIsLoading(false);
      return;
    }

    const components = content.map((comp) => {
      let tempComp = { ...comp };
      delete tempComp.id;
      let tempLeftSide = tempComp.left_side.map((innerComp) => {
        let tempInnerComp = { ...innerComp };
        delete tempInnerComp.id;
        if (tempInnerComp.type === "zap-poll") {
          delete tempInnerComp.metadata.nevent;
        }
        return tempInnerComp;
      });
      let tempRightSide =
        tempComp.layout === 2
          ? tempComp.right_side.map((innerComp) => {
              let tempInnerComp = { ...innerComp };
              delete tempInnerComp.id;
              return tempInnerComp;
            })
          : null;
      return {
        ...tempComp,
        left_side: tempLeftSide,
        right_side: tempRightSide,
      };
    });
    content = JSON.stringify({
      border_color: mainContainerBorderColor,
      background_color: mainContainerBackgroundColor,
      components,
    });

    let tempEvent = {
      created_at,
      kind: 30031,
      content: content,
      tags,
    };
    if (nostrKeys.ext) {
      try {
        tempEvent = await window.nostr.signEvent(tempEvent);
      } catch (err) {
        console.log(err);
        setIsLoading(false);
        return false;
      }
    } else {
      tempEvent = finalizeEvent(tempEvent, nostrKeys.sec);
    }
    setToPublish({
      eventInitEx: tempEvent,
      allRelays: relaysToPublish,
    });
    let pool = new SimplePool();
    let sub = pool.subscribeMany(
      relaysToPublish,
      [{ kinds: [30031], ids: [tempEvent.id] }],
      {
        onevent(event) {
          let metadata = JSON.parse(event.content);
          let parsedContent = getParsed3000xContent(event.tags);
          setWidgetToPostInNote({
            ...parsedContent,
            metadata,
            ...event,
            author: getEmptyNostrUser(event.pubkey),
            naddr: nip19.naddrEncode({
              pubkey: event.pubkey,
              identifier: parsedContent.d,
              kind: event.kind,
            }),
          });
          setShowFinalStep(false);
          sub.close();
          deleteDraft();
        },
      }
    );
  };

  const deleteDraft = () => {
    let tempArray = getDrafts();
    let index = tempArray.findIndex((widget_) => widget_.id === widgetID);
    if (index !== -1) {
      tempArray.splice(index, 1);
      localStorage.setItem("sw-workspaces", JSON.stringify(tempArray));
    }
  };

  const handleSelectedTemplate = (sample) => {
    setMainContainerBackgroundColor(sample.background_color);
    setMainContainerBorderColor(sample.border_color);
    setComponentsTree(getTemplate(sample.components));
    setShowOptions(false);
  };

  return (
    <>
      {showFinalStep && (
        <FinilizePublishing
          title={widget ? widget.title : ""}
          description={widget ? widget.description : ""}
          publish={postWidget}
          exit={() => setShowFinalStep(false)}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      )}
      {showComponents && (
        <Components
          exit={() => setShowComponents(false)}
          addComp={(data) => {
            handleAddComponent(data);
            setShowComponents(false);
          }}
          isMonoLayout={checkMonoLayer()}
        />
      )}
      {widgetToPostInNote && (
        <PostNoteWithWidget
          widget={widgetToPostInNote}
          onlyNext={false}
          exit={() => navigateTo("/smart-widgets")}
        />
      )}
      <div className="fit-container fx-centered fx-start-h fx-start-v">
        <div
          style={{ width: "min(100%,800px)", flex: 1.5 }}
          className={`${!mbHide ? "mb-hide-800" : ""}`}
        >
          <div className="fit-container fx-scattered box-marg-s sticky">
            <div className="fx-centered">
              <div
                className="round-icon-small round-icon-tooltip"
                data-tooltip="Change plan"
                onClick={handleBack}
              >
                <div className="arrow" style={{ rotate: "90deg" }}></div>
              </div>
              <h3>Smart widget</h3>
            </div>
            <div className="fx-centered">
              {preview && (
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Edit widget"
                  onClick={() => setPreview(false)}
                >
                  <div className="edit"></div>
                </div>
              )}
              {!preview && (
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Preview widget"
                  onClick={() => setPreview(true)}
                >
                  <div className="eye-opened"></div>
                </div>
              )}
              <button
                className="btn btn-normal btn-small"
                onClick={handlShowFinalStep}
              >
                Post my widget
              </button>
              <div style={{ position: "relative" }} ref={optionsRef}>
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Templates"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <div className="frames"></div>
                </div>
                {showOptions && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "110%",
                      border: "none",
                      maxWidth: "400px",

                      maxHeight: "400px",
                      overflow: "scroll",
                      width: "max-content",
                      zIndex: 1000,
                      rowGap: "0",
                    }}
                    className="sc-s-18 fx-centered fx-col fx-start-v fx-start-h pointer box-pad-v-s"
                  >
                    {swTemplates.map((category, index) => {
                      return (
                        <div
                          key={index}
                          className="fit-container fx-scattered sc-s-18 pointer box-pad-h-m"
                          style={{
                            border: "none",
                            overflow: "visible",
                            borderRadius: 0,
                            padding: ".25rem 1rem",
                          }}
                        >
                          <div className="fit-container fx-centered fx-start-h fx-start-v fx-col">
                            <p className="gray-c">{category.title}</p>
                            <div className="fit-container fx-centered fx-start-h fx-start-v fx-wrap">
                              {category.samples.map((sample, index_) => {
                                return (
                                  <div
                                    key={index_}
                                    className="option fit-container fx-centered fx-start-h sc-s-18 pointer fx-col"
                                    style={{
                                      border: "none",
                                      width: "48%",
                                      overflow: "visible",
                                    }}
                                    onClick={() =>
                                      handleSelectedTemplate(sample.metadata)
                                    }
                                  >
                                    <div
                                      style={{
                                        width: "100%",
                                        aspectRatio: "16/9",
                                        backgroundImage: `url(${sample.thumbnail})`,
                                      }}
                                      className="bg-img cover-bg sc-s-18"
                                    ></div>
                                    <p className="p-medium">{sample.title}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div
                className="round-icon-small desk-hide round-icon-tooltip"
                data-tooltip="See layers"
                onClick={() => setMbHide(false)}
              >
                <div className="layers"></div>
              </div>
            </div>
          </div>
          <div
            className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col"
            style={{
              backgroundColor: mainContainerBackgroundColor,
              borderColor: mainContainerBorderColor,
              overflow: "visible",
            }}
          >
            {componentsTree.map((com, index) => {
              if (!preview)
                return (
                  <EditContainer
                    key={com.id}
                    pubkey={nostrKeys.pub}
                    metadata={com}
                    showComponents={(data) => {
                      setSelectedContainer(data);
                      setShowComponents(true);
                    }}
                    addContainer={(containerId) =>
                      handleAddContainer(containerId)
                    }
                    selectedContainer={selectedContainer}
                    handleContainerOps={handleContainerOps}
                    selectedLayer={selectedLayer}
                    setSelectedLayer={(contData, layerData) => {
                      setSelectedContainer(contData);
                      setSelectedLayer(layerData);
                    }}
                    totalContainers={componentsTree.length}
                    index={index}
                  />
                );
              if (preview)
                return (
                  <PreviewContainer
                    key={com.id}
                    metadata={com}
                    pubkey={nostrKeys.pub}
                  />
                );
            })}
          </div>
          {!isThereContent && lastDesgin && (
            <div className="fit-container fx-centered box-pad-v">
              <div
                className="round-icon purple-pulse round-icon-tooltip"
                data-tooltip="Load last desgin"
                onClick={loadLastDesign}
              >
                <div className="upload-file"></div>
              </div>
            </div>
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
            width: "min(100%,400px)",
            height: "100vh",
            overflow: "scroll",
            flex: 1,
          }}
          className={`box-pad-h-m box-pad-v sticky ${
            mbHide ? "mb-hide-800" : ""
          }`}
        >
          <div className="fx-centered fx-start-h fit-container box-marg-s desk-hide">
            <div
              className="round-icon-small  round-icon-tooltip "
              onClick={() => setMbHide(true)}
              data-tooltip="Back"
            >
              <div
                className="arrow"
                style={{ rotate: "90deg", scale: ".7" }}
              ></div>
            </div>
            <p>Back to preview</p>
          </div>
          <div className="fit-container fx-scattered">
            <h4 className="orange-c box-marg-s fit-container">Customize</h4>
          </div>

          <div className="fit-container fx-centered fx-col fx-start-v box-pad-v-s">
            <p className="gray-c p-medium">Main widget container</p>
            <div className="fx-scattered fit-container">
              <p>Background color</p>
              <div className="fx-centered">
                <label
                  htmlFor="bg-color"
                  className="pointer"
                  style={{ position: "relative" }}
                >
                  <input
                    type="color"
                    name="bg-color"
                    id="bg-color"
                    style={{
                      opacity: 0,
                      position: "absolute",
                      right: 0,
                      top: 0,
                      zIndex: -1,
                    }}
                    onChange={(e) =>
                      setMainContainerBackgroundColor(e.target.value)
                    }
                  />
                  <div
                    className="round-icon-small"
                    style={{
                      backgroundColor: mainContainerBackgroundColor,
                      position: "relative",
                      zIndex: 2,
                    }}
                  ></div>
                </label>
                {mainContainerBackgroundColor && (
                  <div
                    className="round-icon-small"
                    onClick={() =>
                      setMainContainerBackgroundColor(
                        isDarkMode === "1" ? "#F7F7F7" : "#252429"
                      )
                    }
                  >
                    <div className="switch-arrows"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="fx-scattered fit-container">
              <p>Border color</p>
              <div className="fx-centered">
                <label
                  htmlFor="b-color"
                  className="pointer"
                  style={{ position: "relative" }}
                >
                  <input
                    type="color"
                    name="b-color"
                    id="b-color"
                    style={{
                      opacity: 0,
                      position: "absolute",
                      right: 0,
                      top: 0,
                      zIndex: -1,
                    }}
                    onChange={(e) =>
                      setMainContainerBorderColor(e.target.value)
                    }
                  />
                  <div
                    className="round-icon-small"
                    style={{
                      backgroundColor: mainContainerBorderColor,
                      position: "relative",
                      zIndex: 2,
                    }}
                  ></div>
                </label>
                {mainContainerBorderColor && (
                  <div
                    className="round-icon-small"
                    onClick={() => setMainContainerBorderColor("")}
                  >
                    <div className="trash"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {selectedLayer && (
            <div className="fit-container fx-centered fx-col fx-start-v box-pad-v-s">
              <p className="gray-c p-medium">
                Customize this {selectedLayer.type.replace("-", " ")}
              </p>
              <CustomizeComponent
                metadata={selectedLayer}
                handleComponentMetadata={handleSelectedLayerMetadata}
              />
            </div>
          )}
          <div className="box-pad-v-m"></div>
          <div className="fit-container fx-scattered">
            <h4 className="orange-c">Layers</h4>
          </div>
          <div className="fit-container fx-centered fx-col fx-start-v box-pad-v-m">
            {componentsTree.map((comp, index) => {
              return (
                <div
                  className="fit-container fx-centered fx-col"
                  key={comp?.id}
                >
                  <div
                    className="fit-container fx-scattered sc-s"
                    style={{
                      borderColor:
                        selectedContainer?.id === comp?.id
                          ? "var(--black)"
                          : "",
                      padding: ".5rem",
                      borderRadius: "var(--border-r-6)",
                      backgroundColor: "transparent",
                    }}
                  >
                    <div className="fx-centered fx-start-h">
                      <div className="container-one-24"></div>
                      <p>Container</p>
                    </div>
                    {componentsTree.length > 1 && (
                      <div
                        className="trash"
                        onClick={() => handleDeleteContainer(index)}
                      ></div>
                    )}
                  </div>
                  <div className="fit-container fx-scattered">
                    <div style={{ minWidth: "16px" }}></div>
                    <div className="fit-container fx-centered fx-col">
                      {comp?.left_side.map((innerComp, compIndex) => {
                        return (
                          <div
                            className="fit-container fx-scattered sc-s pointer"
                            style={{
                              borderColor:
                                selectedLayer?.id === innerComp.id
                                  ? "var(--orange-main)"
                                  : "",
                              padding: ".5rem",
                              borderRadius: "var(--border-r-6)",
                              backgroundColor: "transparent",
                            }}
                            key={innerComp.id}
                            onClick={() => {
                              setSelectedContainer(comp);
                              setSelectedLayer(innerComp);
                            }}
                          >
                            <div className="fx-centered fx-start-h">
                              <div className={`${innerComp.type}-24`}></div>
                              <p>{innerComp.type}</p>
                            </div>
                            <div
                              className="trash"
                              onClick={() =>
                                handleDeleteComponent(index, compIndex, "left")
                              }
                            ></div>
                          </div>
                        );
                      })}
                      {comp?.right_side &&
                        comp?.right_side.map((innerComp, compIndex) => {
                          return (
                            <div
                              className="fit-container fx-scattered sc-s pointer"
                              style={{
                                borderColor:
                                  selectedLayer?.id === innerComp.id
                                    ? "var(--orange-main)"
                                    : "",
                                padding: ".5rem",
                                borderRadius: "var(--border-r-6)",
                                backgroundColor: "transparent",
                              }}
                              key={innerComp.id}
                              onClick={() => {
                                setSelectedContainer(comp);
                                setSelectedLayer(innerComp);
                              }}
                            >
                              <div className="fx-centered fx-start-h">
                                <div className={`${innerComp.type}-24`}></div>
                                <p>{innerComp.type}</p>
                              </div>
                              <div
                                className="trash"
                                onClick={() =>
                                  handleDeleteComponent(
                                    index,
                                    compIndex,
                                    "right"
                                  )
                                }
                              ></div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

const EditContainer = ({
  metadata,
  showComponents,
  addContainer,
  selectedContainer,
  handleContainerOps,
  selectedLayer,
  setSelectedLayer,
  totalContainers,
  index,
  pubkey,
}) => {
  const optionsRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const isMonoLayoutRequired = ["video", "zap-poll"].includes(
    metadata.left_side[0]?.type
  );
  const [showContainerLayoutWarning, setShowContainerLayoutWarning] =
    useState(false);

  useEffect(() => {
    let handleOffClick = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [optionsRef]);

  const checkContainerOps = (ops, data) => {
    if (
      data.layout === 1 &&
      (metadata.right_side.length > 0 || metadata.left_side.length > 1)
    ) {
      setShowContainerLayoutWarning({ ops, data });
      return;
    }
    handleContainerOps(ops, data);
  };

  const confirmContainerOps = (confirm) => {
    if (confirm) {
      handleContainerOps("empty container", showContainerLayoutWarning.data);
    }
    setShowContainerLayoutWarning(false);
  };

  return (
    <>
      {showContainerLayoutWarning && (
        <>
          <div className="fixed-container fx-centered">
            <div
              className="sc-s box-pad-h box-pad-v fx-centered fx-col slide-down"
              style={{ width: "min(100%, 400px)", gap: "24px" }}
            >
              <div className="fx-centered fx-col">
                <div className="warning-24"></div>
                <h3>Warning!</h3>
              </div>
              <p className="gray-c p-centered">
                You're switching to a mono layout whilst having elements on both
                sides, this will erase the container content, do you wish to
                proceed?
              </p>
              <div className="fx-centered">
                <button
                  className="btn btn-gst-red"
                  onClick={() => confirmContainerOps(true)}
                >
                  Erase elements
                </button>
                <button
                  className="btn btn-normal"
                  onClick={() => confirmContainerOps(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="fx-centered fx-col fit-container">
        <div className="fx-scattered fx-stretch fit-container sw-container">
          <div
            className="fx-centered fit-container fx-start-h fx-start-v fx-stretch sc-s-d box-pad-h-s box-pad-v-s"
            style={{
              borderRadius: "10px",
              borderRadius: "var(--border-r-18)",
              position: "relative",
              borderColor:
                selectedContainer?.id === metadata.id ? "var(--black)" : "",
              backgroundColor: "transparent",
            }}
          >
            {metadata.left_side.length === 0 && (
              <div
                className="box-pad-h-m box-pad-v-m fx-centered  pointer option"
                onClick={() =>
                  showComponents({ id: metadata.id, side: "left" })
                }
                style={{
                  borderRadius: "10px",
                  flex: metadata.division?.split(":")[0],
                }}
              >
                <div className="plus-sign" style={{ minWidth: "10px" }}></div>{" "}
                <p className="p-medium">Add component</p>
              </div>
            )}
            {metadata.left_side.length > 0 && (
              <div
                style={{ flex: metadata.division?.split(":")[0] }}
                className="fx-centered fx-col"
              >
                {metadata.left_side?.map((comp) => {
                  if (comp?.type === "video")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <VideoComp url={comp?.metadata?.url} />
                      </div>
                    );
                  if (comp?.type === "zap-poll")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <div
                          className="fit-container"
                          style={{ pointerEvents: "none" }}
                        >
                          <ZapPollsComp
                            nevent={comp?.metadata?.nevent}
                            event={
                              comp?.metadata?.content
                                ? JSON.parse(comp?.metadata?.content)
                                : null
                            }
                            content_text_color={
                              comp?.metadata?.content_text_color
                            }
                            options_text_color={
                              comp?.metadata?.options_text_color
                            }
                            options_background_color={
                              comp?.metadata?.options_background_color
                            }
                            options_foreground_color={
                              comp?.metadata?.options_foreground_color
                            }
                            edit={true}
                          />
                        </div>
                      </div>
                    );
                  if (comp?.type === "image")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <ImgComp
                          url={comp?.metadata?.url}
                          aspectRatio={comp?.metadata?.aspect_ratio}
                        />
                      </div>
                    );
                  if (comp?.type === "text")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                          backgroundColor: "transparent",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <TextComp
                          content={comp?.metadata?.content}
                          size={comp?.metadata?.size}
                          weight={comp?.metadata?.weight}
                          textColor={comp?.metadata?.text_color}
                        />
                      </div>
                    );
                  if (comp?.type === "button")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <div
                          className="fit-container"
                          style={{ pointerEvents: "none" }}
                        >
                          <ButtonComp
                            content={comp?.metadata?.content}
                            textColor={comp?.metadata?.text_color}
                            url={comp?.metadata?.url}
                            backgroundColor={comp?.metadata?.background_color}
                            type={comp?.metadata?.type}
                            recipientPubkey={pubkey}
                          />
                        </div>
                      </div>
                    );
                })}
                {metadata.layout === 2 && (
                  <div
                    style={{
                      height: "32px",
                      borderRadius: "var(--border-r-6)",
                      backgroundColor: "var(--pale-gray)",
                    }}
                    className={`fx-centered fit-container option pointer`}
                    onClick={() =>
                      showComponents({ id: metadata.id, side: "left" })
                    }
                  >
                    <div className="plus-sign"></div>
                  </div>
                )}
              </div>
            )}
            {metadata.layout === 2 && metadata.right_side.length > 0 && (
              <div
                style={{
                  flex: metadata.division?.split(":")[1],
                  position: "relative",
                }}
                className="fx-centered fx-col"
              >
                {metadata.right_side?.map((comp) => {
                  if (comp?.type === "video")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        onClick={() => setSelectedLayer(metadata, comp)}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                        }}
                      >
                        <VideoComp url={comp?.metadata?.url} />
                      </div>
                    );
                  if (comp?.type === "image")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        onClick={() => setSelectedLayer(metadata, comp)}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                        }}
                      >
                        <ImgComp
                          url={comp?.metadata?.url}
                          aspectRatio={comp?.metadata?.aspect_ratio}
                        />
                      </div>
                    );
                  if (comp?.type === "text")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        onClick={() => setSelectedLayer(metadata, comp)}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                        }}
                      >
                        <TextComp
                          content={comp?.metadata?.content}
                          size={comp?.metadata?.size}
                          weight={comp?.metadata?.weight}
                          textColor={comp?.metadata?.text_color}
                        />
                      </div>
                    );
                  if (comp?.type === "button")
                    return (
                      <div
                        className="sc-s-d pointer fit-container box-pad-h-s box-pad-v-s"
                        key={comp?.id}
                        style={{
                          borderRadius: "14px",
                          borderColor:
                            selectedLayer && selectedLayer.id === comp?.id
                              ? "var(--orange-main)"
                              : "",
                        }}
                        onClick={() => setSelectedLayer(metadata, comp)}
                      >
                        <div
                          className="fit-container"
                          style={{ pointerEvents: "none" }}
                        >
                          <ButtonComp
                            content={comp?.metadata?.content}
                            textColor={comp?.metadata?.text_color}
                            url={comp?.metadata?.url}
                            backgroundColor={comp?.metadata?.background_color}
                            type={comp?.metadata?.type}
                            recipientPubkey={pubkey}
                          />
                        </div>
                      </div>
                    );
                })}
                <div
                  style={{
                    height: "32px",
                    borderRadius: "var(--border-r-6)",
                    backgroundColor: "var(--pale-gray)",
                  }}
                  className={`fx-centered fit-container option pointer`}
                  onClick={() =>
                    showComponents({ id: metadata.id, side: "right" })
                  }
                >
                  <div className="plus-sign"></div>
                </div>
              </div>
            )}
            {metadata.layout === 2 && metadata.right_side.length === 0 && (
              <div
                className=" fx-centered  pointer option"
                onClick={() =>
                  showComponents({ id: metadata.id, side: "right" })
                }
                style={{
                  borderRadius: "10px",
                  flex: metadata.division?.split(":")[1],
                }}
              >
                <div className="plus-sign" style={{ minWidth: "10px" }}></div>{" "}
                <p className="p-medium">Add component</p>
              </div>
            )}
            {metadata.layout === 2 && (
              <div
                className="round-icon-small round-icon-tooltip"
                data-tooltip="Switch sections"
                onClick={() =>
                  handleContainerOps("switch sections", {
                    ...metadata,
                    index,
                  })
                }
                style={{
                  position: "absolute",
                  top: "50%",
                  left:
                    metadata.division === "1:1"
                      ? "50%"
                      : `${parseInt(metadata.division?.split(":")[0]) * 33}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="switch-arrows"></div>
              </div>
            )}
          </div>
          <div className="fx-scattered fx-col">
            {totalContainers > 1 && (
              <div
                className={`round-icon-small round-icon-tooltip ${
                  index === 0 ? "if-disabled" : ""
                }`}
                data-tooltip="Move up"
                style={{ zIndex: 5 }}
                onClick={() =>
                  index === 0
                    ? null
                    : handleContainerOps("move up", {
                        ...metadata,
                        index,
                      })
                }
              >
                <div
                  className="arrow"
                  style={{ rotate: "180deg", cursor: "unset" }}
                ></div>
              </div>
            )}
            <div
              className="fit-height"
              style={{ position: "relative" }}
              ref={optionsRef}
            >
              <div
                style={{
                  width: "32px",
                  minHeight: "32px",
                  borderRadius: "var(--border-r-6)",
                  backgroundColor: "var(--pale-gray)",
                  cursor: isMonoLayoutRequired ? "not-allowed" : "pointer",
                  zIndex: 4,
                }}
                className="fx-centered option pointer fit-height round-icon-tooltip"
                data-tooltip={isMonoLayoutRequired ? "Only Mono layout" : ""}
                onClick={() =>
                  !isMonoLayoutRequired
                    ? metadata.layout === 1
                      ? handleContainerOps("change section", {
                          ...metadata,
                          layout: 2,
                        })
                      : setShowOptions(!showOptions)
                    : null
                }
              >
                {metadata.layout === 1 && (
                  <div
                    className="plus-sign"
                    style={{ opacity: isMonoLayoutRequired ? 0.5 : 1 }}
                  ></div>
                )}
                {metadata.layout === 2 && (
                  <div
                    className="layout"
                    style={{ minWidth: "14px", minWidth: "14px" }}
                  ></div>
                )}
              </div>
              {showOptions && (
                <div
                  className="fx-centered fx-col sc-s-18  box-pad-v-s fx-start-v"
                  style={{
                    width: "180px",
                    backgroundColor: "var(--c1-side)",
                    position: "absolute",
                    right: "0",
                    top: "calc(100% + 5px)",
                    rowGap: 0,
                    overflow: "visible",
                    zIndex: 100,
                  }}
                >
                  <p className="p-medium gray-c box-pad-h-m box-pad-v-s">
                    Choose a layout
                  </p>
                  <div
                    className="option-no-scale fit-container fx-scattered fx-start-h sc-s-18 pointer box-pad-h-m box-pad-v-s"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(false);
                      checkContainerOps("change section", {
                        ...metadata,
                        layout: 1,
                        division: "1:1",
                      });
                    }}
                    style={{
                      border: "none",
                      overflow: "visible",
                    }}
                  >
                    <div className="container-one-24"></div>
                    <p className="p-medium">Mono layout</p>
                  </div>

                  <div
                    className="option-no-scale fit-container fx-scattered fx-start-h sc-s-18 pointer box-pad-h-m box-pad-v-s"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(false);
                      checkContainerOps("change section", {
                        ...metadata,
                        layout: 2,
                        division: "1:1",
                      });
                    }}
                    style={{
                      border: "none",
                      overflow: "visible",
                      backgroundColor:
                        metadata.division === "1:1" ? "var(--pale-gray)" : "",
                    }}
                  >
                    <div className="container-one-one-24"></div>
                    <p className="p-medium">1:1</p>
                  </div>
                  <div
                    className="option-no-scale fit-container fx-scattered fx-start-h sc-s-18 pointer box-pad-h-m box-pad-v-s"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(false);
                      checkContainerOps("change section", {
                        ...metadata,
                        layout: 2,
                        division: "1:2",
                      });
                    }}
                    style={{
                      border: "none",
                      overflow: "visible",
                      backgroundColor:
                        metadata.division === "1:2" ? "var(--pale-gray)" : "",
                    }}
                  >
                    <div className="container-one-two-24"></div>
                    <p className="p-medium">1:2</p>
                  </div>
                  <div
                    className="option-no-scale fit-container fx-scattered fx-start-h sc-s-18 pointer box-pad-h-m box-pad-v-s"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowOptions(false);
                      checkContainerOps("change section", {
                        ...metadata,
                        layout: 2,
                        division: "2:1",
                      });
                    }}
                    style={{
                      border: "none",
                      overflow: "visible",
                      backgroundColor:
                        metadata.division === "2:1" ? "var(--pale-gray)" : "",
                    }}
                  >
                    <div className="container-two-one-24"></div>
                    <p className="p-medium">2:1</p>
                  </div>
                </div>
              )}
            </div>
            {totalContainers > 1 && (
              <>
                <div
                  className="round-icon-small round-icon-tooltip"
                  data-tooltip="Delete section"
                  style={{ zIndex: 3 }}
                  onClick={() =>
                    handleContainerOps("delete", {
                      ...metadata,
                      index,
                    })
                  }
                >
                  <div className="trash"></div>
                </div>
                <div
                  className={`round-icon-small round-icon-tooltip ${
                    index + 1 === totalContainers ? "if-disabled" : ""
                  }`}
                  data-tooltip="Move down"
                  style={{ zIndex: 2 }}
                  onClick={() =>
                    index + 1 === totalContainers
                      ? null
                      : handleContainerOps("move down", {
                          ...metadata,
                          index,
                        })
                  }
                >
                  <div className="arrow" style={{ cursor: "unset" }}></div>
                </div>
              </>
            )}
          </div>
        </div>
        <div
          style={{
            height: "32px",
            borderRadius: "var(--border-r-6)",
            backgroundColor: "var(--pale-gray)",
          }}
          className={`fx-centered fit-container option pointer ${
            metadata.left_side?.length > 0 || metadata.right_side?.length > 0
              ? ""
              : "if-disabled"
          }`}
          onClick={() =>
            metadata.left_side?.length > 0 || metadata.right_side?.length > 0
              ? addContainer(metadata.id)
              : null
          }
        >
          <div className="plus-sign"></div>
        </div>
      </div>
    </>
  );
};

const FinilizePublishing = ({
  title,
  description,
  exit,
  publish,
  isLoading,
  setIsLoading,
}) => {
  const [title_, setTitle] = useState(title || "");
  const [description_, setDescription] = useState(description || "");

  return (
    <div className="fixed-container box-pad-h fx-centered">
      <div
        className="sc-s-18 box-pad-h box-pad-v fx-centered fx-col"
        style={{ width: "min(100%, 400px)" }}
      >
        <h4>Finilize your widget</h4>
        <p className="gray-c p-centered">
          Give a title and a description to your smart widget
        </p>
        <input
          type="text"
          className="if ifs-full"
          placeholder="Title"
          value={title_}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="txt-area ifs-full"
          placeholder="Description (optional)"
          value={description_}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          className="btn btn-normal btn-full"
          onClick={() => {
            setIsLoading(true);
            publish(title_, description_);
          }}
          disabled={isLoading}
        >
          {isLoading ? <LoadingDots /> : "Publish widget"}
        </button>
        <div className="fx-centered pointer " onClick={exit}>
          <div
            className="round-icon-small roun-icon-tooltip"
            data-tooltip="Change plan"
          >
            <div className="arrow" style={{ rotate: "90deg" }}></div>
          </div>
          <p className="orange-c">Keep editing</p>
        </div>
      </div>
    </div>
  );
};

const Components = ({ exit, addComp, isMonoLayout }) => {
  return (
    <div className="fixed-container box-pad-h fx-centered" onClick={exit}>
      <div
        className="sc-s-18 box-pad-h box-pad-v"
        style={{
          width: "min(100%, 400px)",
          position: "relative",
          overflow: "visible",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <h4 className="box-marg-s">Components</h4>
        <div className="fx-centered fx-start-h fx-wrap">
          <div
            className="fx-centered fx-col sc-s-18 box-pad-h-m box-pad-v-m option pointer"
            style={{ width: "48%" }}
            onClick={() => addComp("image")}
          >
            <div
              style={{ width: "32px", height: "32px" }}
              className="image-24"
            ></div>
            <p className="gray-c p-medium">Image</p>
          </div>
          <div
            className="fx-centered fx-col sc-s-18 box-pad-h-m box-pad-v-m option pointer"
            style={{ width: "48%" }}
            onClick={() => addComp("button")}
          >
            <div
              style={{ width: "32px", height: "32px" }}
              className="button-24"
            ></div>
            <p className="gray-c p-medium">Button</p>
          </div>
          <div
            className={`fx-centered fx-col round-icon-tooltip sc-s-18 box-pad-h-m box-pad-v-m option pointer ${
              !isMonoLayout ? "if-disabled" : ""
            }`}
            style={{ width: "48%", overflow: "visible" }}
            data-tooltip={isMonoLayout ? "" : "Mono layout is required"}
            onClick={() => (isMonoLayout ? addComp("video") : null)}
          >
            <div
              style={{ width: "32px", height: "32px" }}
              className="play-24"
            ></div>
            <p className="gray-c p-medium">Video</p>
          </div>
          <div
            className="fx-centered fx-col sc-s-18 box-pad-h-m box-pad-v-m option pointer"
            style={{ width: "48%" }}
            onClick={() => addComp("text")}
          >
            <div
              style={{ width: "32px", height: "32px" }}
              className="text-24"
            ></div>
            <p className="gray-c p-medium">Text</p>
          </div>
          <div
            className={`fx-centered fx-col round-icon-tooltip sc-s-18 box-pad-h-m box-pad-v-m option pointer ${
              !isMonoLayout ? "if-disabled" : ""
            }`}
            style={{ width: "48%", overflow: "visible" }}
            data-tooltip={isMonoLayout ? "" : "Mono layout is required"}
            onClick={() => (isMonoLayout ? addComp("zap-poll") : null)}
          >
            <div
              style={{ width: "32px", height: "32px" }}
              className="polls-24"
            ></div>
            <p className="gray-c p-medium">Zap poll</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomizeComponent = ({ metadata, handleComponentMetadata }) => {
  const { nostrUser, isDarkMode } = useContext(Context);
  const [showAddPoll, setShowAddPoll] = useState(false);
  const [showBrowsePolls, setShowBrowsePolls] = useState(false);
  const [invoiceData, setInvoicedata] = useState(false);

  const handleMetadata = (key, value) => {
    let tempMetadata = {
      ...metadata,
      metadata: { ...metadata.metadata, [key]: value },
    };
    handleComponentMetadata(tempMetadata);
  };

  useEffect(() => {
    handleChange();
  }, []);

  const handleChange = (e) => {
    if (!e) return;
    let element = e.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  useEffect(() => {
    if (metadata.type === "zap-poll") {
      let relaysToUse = filterRelays(nostrUser?.relays || [], relaysOnPlatform);
      let id;
      try {
        let event = metadata.metadata.content
          ? JSON.parse(metadata.metadata.content)
          : false;
        id = nip19.decode(metadata.metadata.nevent).data.id;

        if (event && id === event.id) return;
      } catch (err) {
        console.log(err);
        return;
      }
      if (!id) return;
      const sub = pool.subscribeMany(
        relaysToUse,
        [{ kinds: [6969], ids: [id] }],
        {
          async onevent(event) {
            try {
              handleMetadata("content", JSON.stringify(event));
            } catch (err) {
              console.log(err);
            }
          },
          oneose() {
            sub.close();
            pool.close(relaysToUse);
          },
        }
      );
    }
    if (metadata.type === "button" && metadata.metadata.type === "zap") {
      if (metadata.metadata.url.startsWith("lnbc")) {
        setInvoicedata(true);
      } else if (!metadata.metadata.url) setInvoicedata(invoiceData);
      else {
        setInvoicedata(false);
      }
    }
  }, [metadata]);

  const extractnpub = (input) => {
    const regex = /\b(np(?:ub|rofile|event)\w*)\b/;

    const match = input.match(regex);

    return match ? match[0] : null;
  };

  const getButtonURL = (value) => {
    if (metadata.type === "button" && metadata.metadata.type === "nostr")
      return extractnpub(value);
    return value;
  };

  const handleUserMetadata = (data) => {
    if (data.lud16) {
      handleMetadata("url", data.lud16);
    }
  };

  if (metadata.type === "image")
    return (
      <div className="fit-container fx-centered fx-col fx-start-v">
        <div className="fit-container fx-scattered">
          <input
            type="text"
            placeholder="URL"
            className="if ifs-full"
            value={metadata.metadata.url}
            onChange={(e) => handleMetadata("url", e.target.value)}
          />
          <UploadFile
            round={true}
            setImageURL={(url) => handleMetadata("url", url)}
            setFileMetadata={() => null}
            setIsUploadsLoading={() => null}
          />
        </div>
        <div className="fit-container fx-scattered">
          <p>Aspect ratio</p>
          <Select
            options={imageAspectRatio}
            setSelectedValue={(value) => handleMetadata("aspect_ratio", value)}
            value={metadata.metadata.aspect_ratio}
            defaultLabel="-- Aspect ratio --"
          />
        </div>
      </div>
    );

  if (metadata.type === "video")
    return (
      <div className="fit-container fx-centered fx-col fx-start-v">
        <div className="fit-container fx-scattered">
          <input
            type="text"
            placeholder="URL"
            className="if ifs-full"
            value={metadata.metadata.url}
            onChange={(e) => handleMetadata("url", e.target.value)}
          />
          <UploadFile
            round={true}
            setImageURL={(url) => handleMetadata("url", url)}
            setFileMetadata={() => null}
            setIsUploadsLoading={() => null}
          />
        </div>
      </div>
    );

  if (metadata.type === "text")
    return (
      <div className="fit-container fx-centered fx-col fx-start-v">
        <div className="fit-container fx-scattered">
          <textarea
            placeholder="Content"
            className="txt-area ifs-full"
            value={metadata.metadata.content}
            onChange={(e) => {
              handleChange(e);
              handleMetadata("content", e.target.value);
            }}
          />
        </div>
        <div className="fit-container fx-scattered">
          <p>Size</p>
          <Select
            options={textSizes}
            setSelectedValue={(value) => handleMetadata("size", value)}
            value={metadata.metadata.size}
            defaultLabel="-- Text sizes --"
          />
        </div>
        <div className="fit-container fx-scattered">
          <p>Weight</p>
          <Select
            options={textWeights}
            setSelectedValue={(value) => handleMetadata("weight", value)}
            value={metadata.metadata.weight}
            defaultLabel="-- Text weights --"
          />
        </div>
        <div className="fx-scattered fit-container">
          <p>Text color</p>
          <div className="fx-centered">
            <label
              htmlFor="text-color"
              className="pointer"
              style={{ position: "relative" }}
            >
              <input
                type="color"
                name="text-color"
                id="text-color"
                style={{
                  opacity: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                  zIndex: -1,
                }}
                value={metadata.metadata.text_color}
                onChange={(e) => handleMetadata("text_color", e.target.value)}
              />
              <div
                className="round-icon-small"
                style={{
                  backgroundColor: metadata.metadata.text_color,
                  position: "relative",
                  zIndex: 2,
                }}
              ></div>
            </label>
            {metadata.metadata.text_color && (
              <div
                className="round-icon-small"
                onClick={() =>
                  handleMetadata(
                    "text_color",
                    isDarkMode === "0" ? "#ffffff" : "#1C1B1F"
                  )
                }
              >
                <div className="switch-arrows"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );

  if (metadata.type === "button")
    return (
      <div className="fit-container fx-centered fx-col fx-start-v">
        <div className="fit-container fx-scattered">
          <input
            type="text"
            placeholder="Content"
            className="if ifs-full"
            value={metadata.metadata.content}
            onChange={(e) => handleMetadata("content", e.target.value)}
          />
        </div>
        <div className="fit-container fx-centered fx-col">
          {metadata.metadata.type === "zap" && (
            <div
              className="fx-scattered fit-container if pointer"
              onClick={() => {
                setInvoicedata(!invoiceData);
                handleMetadata("url", "");
              }}
            >
              <p>Use invoice</p>
              <div
                className={`toggle ${!invoiceData ? "toggle-dim-gray" : ""} ${
                  invoiceData ? "toggle-c1" : "toggle-dim-gray"
                }`}
              ></div>
            </div>
          )}
          <input
            type="text"
            placeholder={
              metadata.metadata.type === "zap"
                ? invoiceData
                  ? "Invoice"
                  : "Lightning address"
                : "URL"
            }
            className="if ifs-full"
            value={metadata.metadata.url}
            onChange={(e) =>
              handleMetadata("url", getButtonURL(e.target.value))
            }
          />

          {metadata.metadata.type === "zap" && !invoiceData && (
            <>
              {!metadata.metadata?.pubkey && (
                <UserSearchBar
                  onClick={(pubkey) => handleMetadata("pubkey", pubkey)}
                  full={true}
                  placeholder="Search user to send as zap (optional)"
                />
              )}
              {metadata.metadata?.pubkey && (
                <NProfilePreviewer
                  pubkey={metadata.metadata?.pubkey || ""}
                  margin={false}
                  close={true}
                  showSharing={false}
                  onClose={() => handleMetadata("pubkey", "")}
                  setMetataData={handleUserMetadata}
                />
              )}
            </>
          )}
          {metadata.metadata.type === "zap" && invoiceData && (
            <p className="gray-c p-medium">
              Generate an invoice in the{" "}
              <a href="/wallet" className="orange-c" target="_blank">
                wallet page
              </a>
            </p>
          )}
        </div>
        <div
          className="fx-scattered fit-container"
          style={{
            opacity: !["regular", "zap"].includes(metadata.metadata.type)
              ? 0.5
              : 1,
          }}
        >
          <p>Background color</p>
          <div
            className="fx-centered"
            style={{
              cursor: !["regular", "zap"].includes(metadata.metadata.type)
                ? "not-allowed"
                : "",
            }}
          >
            <label
              htmlFor="btn-bg-color"
              className="pointer"
              style={{
                position: "relative",
                pointerEvents: !["regular", "zap"].includes(
                  metadata.metadata.type
                )
                  ? "none"
                  : "",
              }}
            >
              <input
                type="color"
                name="btn-bg-color"
                id="btn-bg-color"
                style={{
                  opacity: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                  zIndex: -1,
                }}
                value={metadata.metadata.background_color}
                onChange={(e) =>
                  !["regular", "zap"].includes(metadata.metadata.type)
                    ? null
                    : handleMetadata("background_color", e.target.value)
                }
              />
              <div
                className="round-icon-small"
                style={{
                  backgroundColor: metadata.metadata.background_color,
                  position: "relative",
                  zIndex: 2,
                  cursor: !["regular", "zap"].includes(metadata.metadata.type)
                    ? "not-allowed"
                    : "",
                }}
              ></div>
            </label>
            {metadata.metadata.background_color && (
              <div
                className="round-icon-small"
                onClick={() => handleMetadata("background_color", "")}
              >
                <div className="trash"></div>
              </div>
            )}
          </div>
        </div>
        <div
          className="fx-scattered fit-container"
          style={{
            opacity: !["regular", "zap"].includes(metadata.metadata.type)
              ? 0.5
              : 1,
          }}
        >
          <p>Text color</p>
          <div
            className="fx-centered"
            style={{
              cursor: !["regular", "zap"].includes(metadata.metadata.type)
                ? "not-allowed"
                : "",
            }}
          >
            <label
              htmlFor="btn-text-color"
              className="pointer"
              style={{
                position: "relative",
                pointerEvents: !["regular", "zap"].includes(
                  metadata.metadata.type
                )
                  ? "none"
                  : "",
              }}
            >
              <input
                type="color"
                name="btn-text-color"
                id="btn-text-color"
                style={{
                  opacity: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                  zIndex: -1,
                }}
                value={metadata.metadata.text_color}
                onChange={(e) =>
                  !["regular", "zap"].includes(metadata.metadata.type)
                    ? null
                    : handleMetadata("text_color", e.target.value)
                }
              />
              <div
                className="round-icon-small"
                style={{
                  backgroundColor: metadata.metadata.text_color,
                  position: "relative",
                  zIndex: 2,
                }}
              ></div>
            </label>
            {metadata.metadata.text_color && (
              <div
                className="round-icon-small"
                onClick={() => handleMetadata("text_color", "")}
              >
                <div className="trash"></div>
              </div>
            )}
          </div>
        </div>

        <div className="fit-container fx-scattered">
          <p>Button type</p>
          <Select
            options={buttonTypes}
            className="if"
            setSelectedValue={(value) => handleMetadata("type", value)}
            value={metadata.metadata.type}
            defaultLabel="-- Button types --"
          />
        </div>
      </div>
    );

  if (metadata.type === "zap-poll")
    return (
      <>
        {showBrowsePolls && (
          <BrowsePolls
            exit={() => setShowBrowsePolls(false)}
            setNevent={(data) => {
              handleMetadata("nevent", data);
              setShowBrowsePolls(false);
            }}
          />
        )}
        {showAddPoll && (
          <AddPoll
            exit={() => setShowAddPoll(false)}
            setNevent={(data) => {
              handleMetadata("nevent", data);
              setShowAddPoll(false);
            }}
          />
        )}
        <div className="fit-container fx-centered fx-col fx-start-v">
          <div className="fit-container fx-scattered">
            <input
              type="text"
              placeholder="nEvent"
              className="if ifs-full"
              value={metadata.metadata.nevent}
              onChange={(e) => handleMetadata("nevent", e.target.value)}
            />
            <div className="fx-centered">
              <div
                className="round-icon round-icon-tooltip"
                data-tooltip="Browse polls"
                onClick={() => setShowBrowsePolls(true)}
              >
                <div className="polls"></div>
              </div>
              <div
                className="round-icon round-icon-tooltip"
                data-tooltip="Add poll"
                onClick={() => setShowAddPoll(true)}
              >
                <div className="plus-sign"></div>
              </div>
            </div>
          </div>
          <div className="fx-scattered fit-container">
            <p>Content text color</p>
            <div className="fx-centered">
              <label
                htmlFor="content_text_color"
                className="pointer"
                style={{ position: "relative" }}
              >
                <input
                  type="color"
                  name="content_text_color"
                  id="content_text_color"
                  style={{
                    opacity: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                    zIndex: -1,
                  }}
                  value={metadata.metadata.content_text_color}
                  onChange={(e) =>
                    handleMetadata("content_text_color", e.target.value)
                  }
                />
                <div
                  className="round-icon-small"
                  style={{
                    backgroundColor: metadata.metadata.content_text_color,
                    position: "relative",
                    zIndex: 2,
                  }}
                ></div>
              </label>
              {metadata.metadata.content_text_color && (
                <div
                  className="round-icon-small"
                  onClick={() =>
                    handleMetadata("content_text_color", "#ffffff")
                  }
                >
                  <div className="switch-arrows"></div>
                </div>
              )}
            </div>
          </div>
          <div className="fx-scattered fit-container">
            <p>Options text color</p>
            <div className="fx-centered">
              <label
                htmlFor="options_text_color"
                className="pointer"
                style={{ position: "relative" }}
              >
                <input
                  type="color"
                  name="options_text_color"
                  id="options_text_color"
                  style={{
                    opacity: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                    zIndex: -1,
                  }}
                  value={metadata.metadata.options_text_color}
                  onChange={(e) =>
                    handleMetadata("options_text_color", e.target.value)
                  }
                />
                <div
                  className="round-icon-small"
                  style={{
                    backgroundColor: metadata.metadata.options_text_color,
                    position: "relative",
                    zIndex: 2,
                  }}
                ></div>
              </label>
              {metadata.metadata.options_text_color && (
                <div
                  className="round-icon-small"
                  onClick={() =>
                    handleMetadata(
                      "options_text_color",
                      isDarkMode === "0" ? "#ffffff" : "#1C1B1F"
                    )
                  }
                >
                  <div className="switch-arrows"></div>
                </div>
              )}
            </div>
          </div>
          <div className="fx-scattered fit-container">
            <p>Options background color</p>
            <div className="fx-centered">
              <label
                htmlFor="options_background_color"
                className="pointer"
                style={{ position: "relative" }}
              >
                <input
                  type="color"
                  name="options_background_color"
                  id="options_background_color"
                  style={{
                    opacity: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                    zIndex: -1,
                  }}
                  value={metadata.metadata.options_background_color}
                  onChange={(e) =>
                    handleMetadata("options_background_color", e.target.value)
                  }
                />
                <div
                  className="round-icon-small"
                  style={{
                    backgroundColor: metadata.metadata.options_background_color,
                    position: "relative",
                    zIndex: 2,
                  }}
                ></div>
              </label>
              {metadata.metadata.options_background_color && (
                <div
                  className="round-icon-small"
                  onClick={() =>
                    handleMetadata(
                      "options_background_color",
                      isDarkMode === "0" ? "#2f2f2f" : "#e5e5e5"
                    )
                  }
                >
                  <div className="switch-arrows"></div>
                </div>
              )}
            </div>
          </div>
          <div className="fx-scattered fit-container">
            <p>Options foreground color</p>
            <div className="fx-centered">
              <label
                htmlFor="options_foreground_color"
                className="pointer"
                style={{ position: "relative" }}
              >
                <input
                  type="color"
                  name="options_foreground_color"
                  id="options_foreground_color"
                  style={{
                    opacity: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                    zIndex: -1,
                  }}
                  value={metadata.metadata.options_foreground_color}
                  onChange={(e) =>
                    handleMetadata("options_foreground_color", e.target.value)
                  }
                />
                <div
                  className="round-icon-small"
                  style={{
                    backgroundColor: metadata.metadata.options_foreground_color,
                    position: "relative",
                    zIndex: 2,
                  }}
                ></div>
              </label>
              {metadata.metadata.options_foreground_color && (
                <div
                  className="round-icon-small"
                  onClick={() =>
                    handleMetadata("options_foreground_color", "#ee7700")
                  }
                >
                  <div className="switch-arrows"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
};

const SWTemplates = ({ setBuildOption, setTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(false);
  const useTemplate = () => {
    setTemplate(selectedTemplate.metadata.components);
    setSelectedTemplate(false);
  };

  return (
    <>
      {selectedTemplate && (
        <SWTemplate
          template={selectedTemplate}
          exit={() => setSelectedTemplate(false)}
          useTemplate={useTemplate}
        />
      )}
      <div
        className="fit-container fit-height fx-centered fx-col fx-start-h fx-start-v box-pad-h-s box-pad-v-m"
        style={{
          mimnHeight: "100vh",
        }}
      >
        <div className="fx-centered box-marg-s fx-start-h fit-container">
          <div
            className="round-icon-small round-icon-tooltip"
            data-tooltip="Change plan"
            onClick={() => setBuildOption("normal")}
          >
            <div className="arrow" style={{ rotate: "90deg" }}></div>
          </div>
          <h3>Templates</h3>
        </div>
        <div
          className="fit-container fx-centered fx-col fx-start-h fx-start-v"
          style={{ rowGap: "16px" }}
        >
          {swTemplates.map((template, index) => {
            return (
              <div
                className="fit-container fx-centered fx-col fx-start-h fx-start-v"
                style={{ rowGap: "16px" }}
                key={index}
              >
                <h4>{template.title}</h4>
                <div className="fit-container fx-wrap fx-centered fx-start-h fx-start-v">
                  {template.samples.map((sample, index) => {
                    return (
                      <div
                        className="fx-centered fx-col pointer"
                        key={index}
                        onClick={() => setSelectedTemplate(sample)}
                        style={{ flex: "1 1 250px" }}
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "16/9",
                            backgroundImage: `url(${sample.thumbnail})`,
                          }}
                          className="bg-img cover-bg sc-s-18"
                        ></div>
                        <p className="gray-c">{sample.title}</p>
                      </div>
                    );
                  })}
                  <div style={{ flex: "1 1 250px" }}></div>
                  <div style={{ flex: "1 1 250px" }}></div>
                  <div style={{ flex: "1 1 250px" }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

const SWTemplate = ({ template, useTemplate, exit }) => {
  return (
    <div
      className="fixed-container box-pad-h fx-centered"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <div
        style={{
          width: "min(100%, 600px)",
          maxHeight: "90vh",
          overflow: "scroll",
          position: "relative",
        }}
        className="sc-s-18 fx-centered fx-start-h fx-start-v fx-col slide-up"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          className="fit-container fx-centered fx-start-h fx-start-v fx-col box-pad-h-m"
          style={{ paddingTop: "1rem" }}
        >
          <div className="fx-scattered fit-container">
            <h4>{template.title}</h4>
            <div
              className="close"
              style={{ position: "static" }}
              onClick={exit}
            >
              <div></div>
            </div>
          </div>
          <p className="gray-c">{template.description}</p>
        </div>
        <div className="box-pad-h-m fit-container">
          <PreviewWidget
            widget={template.metadata}
            pubkey={process.env.REACT_APP_YAKI_PUBKEY}
          />
        </div>
        <div
          style={{ position: "sticky", bottom: "-.5px", padding: "1rem" }}
          className="sticky fit-container fx-centered"
          onClick={useTemplate}
        >
          <button className="btn btn-orange btn-full">Use template</button>
        </div>
      </div>
    </div>
  );
};

const SWDrafts = ({ back, setTemplate }) => {
  const { nostrKeys } = useContext(Context);
  const [drafts, setDrafts] = useState(getDrafts());
  const deleteDraft = (index) => {
    let tempArray = Array.from(drafts);
    tempArray.splice(index, 1);
    setDrafts(tempArray);
    localStorage.setItem("sw-workspaces", JSON.stringify(tempArray));
  };
  return (
    <div className="box-pad-v">
      {drafts.length > 0 && (
        <div className="fx-centered box-marg-s fx-start-h fit-container">
          <div
            className="round-icon-small round-icon-tooltip"
            data-tooltip="Change plan"
            onClick={() => back("normal")}
          >
            <div className="arrow" style={{ rotate: "90deg" }}></div>
          </div>
          <h3>Drafts</h3>
        </div>
      )}
      {drafts.length > 0 && (
        <div className="fit-container fx-centered fx-wrap fx-start-h fx-start-v">
          {drafts?.map((draft, index) => {
            return (
              <div
                style={{ width: "min(100%, 500px)", overflow: "visible" }}
                key={draft.id}
                className="fit-container fx-centered fx-col sc-s-18 box-pad-h-m box-pad-v-m"
              >
                <div className="fit-container fx-scattered">
                  <div>
                    <p className="gray-c p-medium">Last updated</p>
                    <Date_
                      toConvert={
                        new Date(draft?.last_updated * 1000 || Date.now())
                      }
                      time={true}
                    />
                  </div>
                  <OptionsDropdown
                    options={[
                      <div onClick={() => setTemplate(draft, true)}>
                        Publish
                      </div>,
                      <div onClick={() => setTemplate(draft)}>Edit</div>,
                      <div className="red-c" onClick={() => deleteDraft(index)}>
                        Delete
                      </div>,
                    ]}
                  />
                </div>

                {(draft.components.length === 1 &&
                  (draft.components[0].left_side.length > 0 ||
                    draft.components[0].right_side.length > 0)) ||
                draft.components.length > 1 ? (
                  <PreviewWidget widget={draft} pubkey={nostrKeys.pub} />
                ) : (
                  <div
                    className="fit-container fx-centered fx-col"
                    style={{ height: "150px" }}
                  >
                    <div className="smart-widget-24"></div>
                    <p className="gray-c p-medium">Empty widget</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {drafts.length === 0 && (
        <PagePlaceholder
          page={"widgets-draft"}
          onClick={() => back("normal")}
        />
      )}
    </div>
  );
};

const getDrafts = () => {
  try {
    let drafts = localStorage.getItem("sw-workspaces");
    if (drafts) {
      drafts = JSON.parse(drafts);
      if (Array.isArray(drafts)) return drafts;
      return [];
    }
    return [];
  } catch (err) {
    return [];
  }
};
