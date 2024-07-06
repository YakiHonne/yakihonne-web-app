import React, { useContext, useEffect, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { Context } from "../../Context/Context";
import PagePlaceholder from "../../Components/PagePlaceholder";
import NavbarNOSTR from "../../Components/NOSTR/NavbarNOSTR";
import LoadingDots from "../../Components/LoadingDots";
import Date_ from "../../Components/Date_";
import axiosInstance from "../../Helpers/HTTP_Client";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import { publishPost } from "../../Helpers/NostrPublisher";
import relaysOnPlatform from "../../Content/Relays";
import LoadingScreen from "../../Components/LoadingScreen";
import { SimplePool } from "nostr-tools";
import {
  decodeUrlOrAddress,
  encodeLud06,
  getBech32,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import ToChangeProfilePic from "../../Components/NOSTR/ToChangeProfilePic";
import { shortenKey } from "../../Helpers/Encryptions";
import ToUpdateRelay from "../../Components/NOSTR/ToUpdateRelay";
import axios from "axios";
import { Helmet } from "react-helmet";

// import {requestInvoice} from 'lnurl-pay'

const pool = new SimplePool();

export default function NostrSettings() {
  const {
    setNostrUserData,
    nostrUser,
    nostrUserLoaded,
    nostrKeys,
    nostrUserAbout,
    nostrUserTags,
    nostrUserLogout,
    setToast,
  } = useContext(Context);
  const [isLoading, setIsLoading] = useState(false);
  const [updatedProfilePic, setUpdatedProfilePic] = useState(false);
  const [timestamp, setTimestamp] = useState(false);
  const [userName, setUserName] = useState(false);
  const [userAbout, setUserAbout] = useState(false);
  const [userNIP05, setUserNIP05] = useState(false);
  const [userThumbnail, setUserThumbnail] = useState(false);
  const [userThumbnailPrev, setUserThumbnailPrev] = useState("");
  const [showProfilePicChanger, setShowProfilePicChanger] = useState(false);
  const [showRelaysUpdater, setShowRelaysUpdater] = useState(false);
  const [showCoverUploader, setCoverUploader] = useState(false);
  const [selectedTab, setSelectedTab] = useState("");
  const [tempUserRelays, setTempUserRelays] = useState(nostrUser.relays);
  const [lud06, setLud06] = useState("");
  const [lud16, setLud16] = useState("");

  useEffect(() => {
    setTempUserRelays(nostrUser.relays);
    setLud06(nostrUserAbout.lud06);
    setLud16(nostrUserAbout.lud16);
    setUserNIP05(nostrUser.nip05);
  }, [nostrUser]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        
        let author = await pool.get([relaysOnPlatform[0]], {
          kinds: [0],
          authors: [nostrKeys.pub],
        });
        if (author) setNostrUserData(author);
        setIsLoading(false);
      } catch (err) {
        console.log(err);
      }
    };
    if (!timestamp) return;
    fetchData();
  }, [timestamp]);

  const updateInfos = async () => {
    let content = { ...nostrUserAbout };
    content.name = userName !== false ? userName : content.name;
    content.display_name = userName !== false ? userName : content.name;
    content.about = userAbout !== false ? userAbout : content.about || "";
    content.nip05 = userNIP05 !== false ? userNIP05 : content.nip05 || "";

    setIsLoading(true);
    let updateUser = await publishPost(
      nostrKeys,
      0,
      JSON.stringify(content),
      nostrUserTags,
      relaysOnPlatform
    );
    setUserAbout(false);
    setUserName(false);
    // setIsLoading(false);
    setTimestamp(new Date().getTime());
  };

  const copyKey = (keyType, key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `${keyType} key was copied! 👏`,
    });
  };

  const removeRelayFromList = (index) => {
    let tempArray = Array.from(tempUserRelays);
    tempArray.splice(index, 1);
    setTempUserRelays(tempArray);
  };

  const saveRelays = async () => {
    setIsLoading(true);
    let kind3 = await saveInKind3();
    let kind10002 = await saveInKind10002();
    if (kind10002 || kind3) {
      setToast({
        type: 1,
        desc: "Relays are saved successfully!",
      });
      setIsLoading(false);
      return;
    }
    setToast({
      type: 2,
      desc: "Could not update relays list!",
    });
    setIsLoading(false);
  };
  const saveInKind3 = async () => {
    try {
      let content = convertArrayToKind3();
      let res = await publishPost(
        nostrKeys,
        3,
        content,
        [],
        [...relaysOnPlatform]
      );
      if (res.find((item) => item.status)) return true;
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  const saveInKind10002 = async () => {
    try {
      let tags = convertArrayToKind10002();
      let res = await publishPost(nostrKeys, 10002, "", tags, [
        ...relaysOnPlatform,
      ]);
      if (res.find((item) => item.status)) return true;
      return false;
    } catch (err) {
      console.log(err);
      return false;
    }
  };
  const convertArrayToKind3 = () => {
    let tempObj = {};
    for (let relay of tempUserRelays) {
      tempObj[relay] = { read: true, write: true };
    }
    return JSON.stringify(tempObj);
  };
  const convertArrayToKind10002 = () => {
    let tempArray = [];
    for (let relay of tempUserRelays) {
      tempArray.push(["r", relay]);
    }
    return tempArray;
  };

  const uploadCover = async (upload = false, file) => {
    let cover = file;
    if (cover) {
      try {
        setIsLoading(true);
        var content = getUserContent(file);
        var uploadedImage = "";
        if (upload) {
          let fd = new FormData();
          fd.append("file", cover);
          fd.append("pubkey", nostrKeys.pub);
          let data = await axiosInstance.post("/api/v1/file-upload", fd, {
            headers: { "Content-Type": "multipart/formdata" },
          });
          uploadedImage = data.data.image_path;
          content = getUserContent(data.data.image_path);
        }
        let publish = await publishPost(
          nostrKeys,
          0,
          content,
          nostrUserTags,
          relaysOnPlatform
        );
        if (!publish) {
          setToast({
            type: 2,
            desc: "Publishing was cancelled!",
          });
          return;
        }
        if (publish.find((item) => item.status)) {
          setToast({
            type: 1,
            desc: "You have updated your banner",
          });
          setTimestamp(new Date().getTime());
          deleteFromS3(nostrUser.banner);
          setIsLoading(false);
          return;
        }
        setToast({
          type: 2,
          desc: "An error occured while updating your banner",
        });
        setIsLoading(false);
        deleteFromS3(uploadedImage);
      } catch (err) {
        setIsLoading(false);
        console.log(err);
        setToast({
          type: 2,
          desc: `The image size exceeded the required limit, the max size allowed is 1Mb.`,
        });
      }
    }
  };
  const clearCover = async () => {
    try {
      setIsLoading(true);
      const content = getUserContent("");
      let publish = await publishPost(
        nostrKeys,
        0,
        content,
        nostrUserTags,
        relaysOnPlatform
      );
      if (!publish) {
        setToast({
          type: 2,
          desc: "Publishing was cancelled!",
        });
        return;
      }
      if (publish.find((item) => item.status)) {
        setToast({
          type: 1,
          desc: "You have updated your banner",
        });
        setTimestamp(new Date().getTime());
        setIsLoading(false);
        deleteFromS3(nostrUser.banner);
        return;
      }
      setToast({
        type: 2,
        desc: "An error occured while updating your banner",
      });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      console.log(err);
    }
  };
  const getUserContent = (banner) => {
    let content = {
      ...nostrUserAbout,
    };
    content.banner = banner;
    return JSON.stringify(content);
  };
  const deleteFromS3 = async (img) => {
    if (img.includes("yakihonne.s3")) {
      let data = await axiosInstance.delete("/api/v1/file-upload", {
        params: { image_path: img },
      });
      return true;
    }
    return false;
  };

  // console.log(decodeUrlOrAddress("lnurl1dp68gurn8ghj7em9w3skccne9e3k7mf09emk2mrv944kummhdchkcmn4wfk8qtmddahhxalfpnk"))
  // console.log(encodeLud06(decodeUrlOrAddress("lnurl1dp68gurn8ghj7em9w3skccne9e3k7mf09emk2mrv944kummhdchkcmn4wfk8qtmddahhxalfpnk")))

  const handleLUD16 = async (e) => {
    let add = e.target.value;
    let tempAdd = encodeLud06(decodeUrlOrAddress(add));
    setLud16(add);
    if (!tempAdd) setLud06("");
    if (tempAdd) {
      let data = await axios.get(decodeUrlOrAddress(add));

      setLud16(JSON.parse(data.data.metadata)[0][1]);
      setLud06(tempAdd);
    }
  };

  const updateLightning = async () => {
    if (!(lud06 && lud16)) return;
    let content = { ...nostrUserAbout };
    content.lud06 = lud06;
    content.lud16 = lud16;
    setIsLoading(true);
    let updateUser = await publishPost(
      nostrKeys,
      0,
      JSON.stringify(content),
      nostrUserTags,
      relaysOnPlatform
    );
    setIsLoading(true);
    setTimestamp(new Date().getTime());
  };

  if (!nostrUserLoaded) return <LoadingScreen />;
  // if (!nostrUser) return (window.location = "/home");
  return (
    <>
      {showCoverUploader && (
        <CoverUploader
          exit={() => setCoverUploader(false)}
          oldThumbnail={nostrUser.banner}
          uploadCover={uploadCover}
        />
      )}
      {showRelaysUpdater && (
        <ToUpdateRelay
          exit={() => setShowRelaysUpdater(false)}
          exitAndRefresh={() => {
            setTimestamp(new Date().getTime());
            setShowRelaysUpdater(false);
          }}
        />
      )}
      {showProfilePicChanger && (
        <ToChangeProfilePic
          cancel={() => setShowProfilePicChanger(false)}
          exit={() => {
            setIsLoading(true);
            setShowProfilePicChanger(false);
            setTimestamp(new Date().getTime());
          }}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | Settings</title>
        </Helmet>
        <SidebarNOSTR />
        <main
          className={`main-page-nostr-container ${isLoading ? "flash" : ""}`}
          style={{ pointerEvents: isLoading ? "none" : "auto" }}
        >
          {nostrUser && (nostrKeys.sec || nostrKeys.ext) && (
            <>
              <NavbarNOSTR />
              <div className="fit-container box-pad-h box-marg-full fx-centered fx-col">
                <div
                  className="fit-container sc-s profile-cover fx-centered fx-end-h fx-col bg-img cover-bg"
                  style={{
                    height: "40vh",
                    position: "relative",
                    backgroundImage: nostrUser.banner
                      ? `url(${nostrUser.banner})`
                      : "",
                  }}
                >
                  {nostrUser.banner && (
                    <div
                      className="fx-centered pointer"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--border-r-50)",
                        backgroundColor: "var(--dim-gray)",
                        position: "absolute",
                        right: "24px",
                        top: "24px",
                      }}
                      onClick={clearCover}
                    >
                      <div className="trash-24"></div>
                    </div>
                  )}
                  <div
                    className="fit-container fx-col fx-centered"
                    style={{
                      transform: "translateY(60%)",
                    }}
                  >
                    <div
                      style={{
                        border: "6px solid var(--white)",
                        borderRadius: "var(--border-r-50)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      className="settings-profile-pic"
                    >
                      <UserProfilePicNOSTR
                        img={nostrUser.img}
                        size={150}
                        ring={false}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          width: "100%",
                          height: "100%",
                          zIndex: 1,
                          backgroundColor: "rgba(0,0,0,.5)",
                        }}
                        className="fx-centered pointer toggle"
                        onClick={() => setShowProfilePicChanger(true)}
                      >
                        <div
                          className="image-24"
                          style={{ filter: "invert()" }}
                        ></div>
                      </div>
                    </div>
                    <div className="box-pad-v-s fx-centered fx-col fit-container">
                      {userName === false && (
                        <>
                          <p className="gray-c">
                            <Date_ toConvert={nostrUser.added_date} />
                          </p>
                        </>
                      )}
                      <div
                        className="fx-centered"
                        style={{ columnGap: "10px" }}
                      >
                        {userName !== false ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              updateInfos();
                            }}
                            className="fit-container fx-centered"
                          >
                            <input
                              className="if"
                              placeholder="your name"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                            />
                            <div
                              className="send-24"
                              role="submit"
                              onClick={updateInfos}
                            ></div>
                            <div
                              className="cancel-24"
                              onClick={() => setUserName(false)}
                            ></div>
                          </form>
                        ) : (
                          <>
                            <h3>{nostrUser.name}</h3>
                            <div
                              className="edit-24"
                              onClick={() => setUserName(nostrUser.name)}
                            ></div>
                          </>
                        )}
                      </div>
                      <div
                        className="fx-centered fit-container"
                        style={{ columnGap: "10px" }}
                      >
                        {userAbout !== false ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              updateInfos();
                            }}
                            className="fit-container fx-centered fx-col"
                          >
                            <textarea
                              className="txt-area box-pad-v-m ifs-full"
                              placeholder="About"
                              rows={20}
                              value={userAbout}
                              onChange={(e) => setUserAbout(e.target.value)}
                              style={{ maxWidth: "400px" }}
                            />
                            <div className="fx-centered">
                              <div
                                className="send-24"
                                role="submit"
                                onClick={updateInfos}
                              ></div>
                              <div
                                className="cancel-24"
                                onClick={() => setUserAbout(false)}
                              ></div>
                            </div>
                          </form>
                        ) : (
                          <>
                            <p
                              style={{ maxWidth: "400px" }}
                              className="p-centered"
                            >
                              {nostrUser.about || (
                                <span className="gray-c italic-txt">
                                  About yourself
                                </span>
                              )}
                            </p>
                            <div
                              className="edit-24"
                              onClick={() => setUserAbout(nostrUser.about)}
                            ></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      columnGap: "5px",
                      position: "absolute",
                      left: "24px",
                      top: "24px",
                      width: "130px",
                    }}
                    className="pointer"
                  >
                    <div
                      className="fit-container sticker sticker-gray-black"
                      style={{ columnGap: "5px" }}
                      onClick={() => setCoverUploader(true)}
                    >
                      {isLoading ? (
                        <LoadingDots />
                      ) : (
                        <>
                          <p>+</p>
                          <p className="p-medium">Upload cover</p>
                        </>
                      )}
                      {/* <input
                        type="file"
                        accept="image/jpg, image/png"
                        onChange={uploadCover}
                      /> */}
                    </div>
                  </div>
                </div>
                <div style={{ height: "20vh" }}></div>
              </div>
              <div className="fit-container fx-centered">
                <div
                  className="fit-container fx-centered fx-col"
                  style={{ maxWidth: "500px" }}
                >
                  <div className="fit-container sc-s-18 fx-scattered fx-col pointer">
                    <div
                      className="fx-scattered fit-container  box-pad-h-m box-pad-v-m "
                      onClick={() =>
                        selectedTab === "keys"
                          ? setSelectedTab("")
                          : setSelectedTab("keys")
                      }
                    >
                      <div className="fx-centered fx-start-h">
                        <div className="key-icon-24"></div>
                        <p>Your keys</p>
                      </div>
                      <div className="arrow"></div>
                    </div>
                    <hr />
                    {selectedTab === "keys" && (
                      <div className="fit-container fx-col fx-centered  box-pad-h-m box-pad-v-m ">
                        <p className="c1-c p-left fit-container">
                          Your secret key
                        </p>
                        <div
                          className={`fx-scattered if pointer fit-container ${
                            nostrKeys.sec ? "dashed-onH" : "if-disabled"
                          }`}
                          style={{ borderStyle: "dashed" }}
                          onClick={() =>
                            nostrKeys.sec
                              ? copyKey(
                                  "Private",
                                  getBech32("nsec", nostrKeys.sec)
                                )
                              : null
                          }
                        >
                          <p>
                            {nostrKeys.sec ? (
                              shortenKey(getBech32("nsec", nostrKeys.sec))
                            ) : (
                              <span className="italic-txt gray-c">
                                {nostrKeys.ext
                                  ? "check your extension settings"
                                  : "No secret key is provided"}
                              </span>
                            )}
                          </p>
                          {nostrKeys.sec && <div className="copy-24"></div>}
                        </div>
                        <p className="c1-c p-left fit-container">
                          Your public key
                        </p>
                        <div
                          className="fx-scattered if pointer dashed-onH fit-container"
                          style={{ borderStyle: "dashed" }}
                          onClick={() =>
                            copyKey("Public", getBech32("npub", nostrKeys.pub))
                          }
                        >
                          <p>{shortenKey(getBech32("npub", nostrKeys.pub))}</p>
                          <div className="copy-24"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="fit-container sc-s-18 fx-scattered fx-col pointer">
                    <div
                      className="fx-scattered fit-container  box-pad-h-m box-pad-v-m "
                      onClick={() =>
                        selectedTab === "nip05"
                          ? setSelectedTab("")
                          : setSelectedTab("nip05")
                      }
                    >
                      <div className="fx-centered fx-start-h">
                        <div className="env-24"></div>
                        <p>NIP-05 address</p>
                      </div>
                      <div className="arrow"></div>
                    </div>
                    <hr />

                    {selectedTab === "nip05" && (
                      <div className="fit-container fx-col fx-centered  box-pad-h-m box-pad-v-m ">
                        <p className="gray-c p-medium fit-container p-left">
                          NIP-05
                        </p>
                        <input
                          type="text"
                          className="if ifs-full"
                          value={userNIP05}
                          onChange={(e) => setUserNIP05(e.target.value)}
                          placeholder={"Enter your NIP-05 address"}
                        />

                        <div className="fit-container fx-centered fx-end-h">
                          <button
                            className="btn btn-normal"
                            onClick={updateInfos}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="fit-container sc-s-18 fx-scattered fx-col pointer">
                    <div
                      className="fx-scattered fit-container  box-pad-h-m box-pad-v-m "
                      onClick={() =>
                        selectedTab === "lnurls"
                          ? setSelectedTab("")
                          : setSelectedTab("lnurls")
                      }
                    >
                      <div className="fx-centered fx-start-h">
                        <div className="lightning"></div>
                        <p>Lightning addresses</p>
                      </div>
                      <div className="arrow"></div>
                    </div>
                    <hr />

                    {selectedTab === "lnurls" && (
                      <div className="fit-container fx-col fx-centered  box-pad-h-m box-pad-v-m ">
                        <p className="gray-c p-medium fit-container p-left">
                          LUD-16
                        </p>
                        <input
                          type="text"
                          className="if ifs-full"
                          value={lud16}
                          onChange={handleLUD16}
                          placeholder={"Enter your address LUD-06 or LUD-16"}
                        />
                        <p className="gray-c p-medium fit-container p-left">
                          LUD-06
                        </p>
                        <input
                          type="text"
                          className="if if-disabled ifs-full"
                          value={lud06}
                          placeholder={"-"}
                          disabled
                          onChange={null}
                        />
                        {((nostrUserAbout.lud16 !== lud16 && lud06) ||
                          !lud16) && (
                          <div className="fit-container fx-centered fx-end-h">
                            <button
                              className="btn btn-normal"
                              onClick={updateLightning}
                            >
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="fit-container sc-s-18 fx-scattered fx-col pointer">
                    <div
                      className="fx-scattered fit-container box-pad-h-m box-pad-v-m "
                      onClick={() =>
                        selectedTab === "relays"
                          ? setSelectedTab("")
                          : setSelectedTab("relays")
                      }
                    >
                      <div className="fx-centered fx-start-h">
                        <div className="server-24"></div>
                        <p>Relays settings</p>
                      </div>
                      <div className="arrow"></div>
                    </div>
                    <hr />
                    {selectedTab === "relays" && (
                      <>
                        <div
                          className="fit-container fx-col fx-centered  fx-start-v box-pad-h-m box-pad-v-m fx-start-h"
                          style={{
                            maxHeight: "40vh",
                            overflow: "scroll",
                            overflowX: "hidden",
                          }}
                        >
                          {/* {relaysOnPlatform.map((relay, index) => {
                            return (
                              <div
                                key={`${relay}-${index}`}
                                className="if fit-container fx-centered  fx-start-h if-disabled fx-shrink"
                              >
                                <p className="c1-c">{relay}</p>
                              </div>
                            );
                          })} */}
                          {tempUserRelays?.map((relay, index) => {
                            if (index < relaysOnPlatform.length)
                              return (
                                <div
                                  key={`${relay}-${index}`}
                                  className="if fit-container fx-centered  fx-start-h if-disabled fx-shrink"
                                >
                                  <p className="c1-c">{relay}</p>
                                </div>
                              );
                            return (
                              <div
                                key={`${relay}-${index}`}
                                className="if fit-container fx-scattered fx-shrink"
                              >
                                <p>{relay}</p>
                                <div onClick={() => removeRelayFromList(index)}>
                                  <div className="trash"></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="fx-centered fx-end-h fit-container box-pad-h box-marg-s">
                          <button
                            className="btn btn-gst"
                            onClick={() => setShowRelaysUpdater(true)}
                            disabled={isLoading}
                          >
                            {isLoading ? <LoadingDots /> : "Add relay"}
                          </button>
                          <button
                            className={`btn ${
                              Object.entries(nostrUser.relays).length !==
                              tempUserRelays.length
                                ? "btn-normal"
                                : "btn-disabled"
                            }`}
                            onClick={saveRelays}
                            disabled={
                              !(
                                Object.entries(nostrUser.relays).length !==
                                tempUserRelays.length
                              ) || isLoading
                            }
                          >
                            {isLoading ? <LoadingDots /> : "Save"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div
                    className="fit-container sc-s-18 fx-scattered box-pad-h-m box-pad-v-m pointer"
                    onClick={nostrUserLogout}
                  >
                    <div className="fx-centered fx-start-h">
                      <div className="logout-24"></div>
                      <p>Logout</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          {nostrUser && !nostrKeys.sec && !nostrKeys.ext && (
            <PagePlaceholder page={"nostr-unauthorized"} />
          )}
          {!nostrUser && <PagePlaceholder page={"nostr-not-connected"} />}
        </main>
      </div>
    </>
  );
}

const CoverUploader = ({ exit, oldThumbnail, uploadCover }) => {
  const { setToast } = useContext(Context);
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailPrev, setThumbnailPrev] = useState(oldThumbnail || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(oldThumbnail || "");

  const handleImageUpload = (e) => {
    let file = e.target.files[0];
    if (file && !file.type.includes("image/")) {
      setToast({
        type: 2,
        desc: "Image type is unsupported!",
      });
      return;
    }
    if (file) {
      setThumbnail(file);
      setThumbnailPrev(URL.createObjectURL(file));
      setThumbnailUrl("");
    }
  };

  const initThumbnail = async () => {
    setThumbnailPrev("");
    setThumbnailUrl("");
    setThumbnail("");
  };

  const handleThumbnailValue = (e) => {
    let value = e.target.value;
    setThumbnailUrl(value);
    setThumbnailPrev(value);
    setThumbnail("");
  };

  const save = () => {
    if (!thumbnail && !thumbnailUrl) return;
    if (thumbnail) {
      uploadCover(true, thumbnail);
      exit();
      return;
    }
    uploadCover(false, thumbnailUrl);
    exit();
    return;
  };

  return (
    <div className="fixed-container fx-centered">
      <div
        className="sc-s box-pad-v box-pad-h fx-centered fx-col"
        style={{ position: "relative", width: "min(100%, 500px)" }}
      >
        <div className="close" onClick={exit}>
          <div></div>
        </div>
        <div className="fit-container box-pad-h box-marg-s fx-centered">
          <h4>Refresh your cover image</h4>
        </div>
        <div
          className="fit-container fx-centered fx-col box-pad-h sc-s-d bg-img cover-bg"
          style={{
            position: "relative",
            height: "200px",
            backgroundImage: `url(${thumbnailPrev})`,
            borderStyle: thumbnailPrev ? "none" : "dotted",
          }}
        >
          {thumbnailPrev && (
            <div
              style={{
                width: "32px",
                height: "32px",
                position: "absolute",
                right: "16px",
                top: "16px",
                backgroundColor: "var(--dim-gray)",
                borderRadius: "var(--border-r-50)",
                zIndex: 10,
              }}
              className="fx-centered pointer"
              onClick={initThumbnail}
            >
              <div className="trash"></div>
            </div>
          )}

          {!thumbnailPrev && (
            <>
              <div className="image-24"></div>
              <p className="gray-c p-medium">(thumbnail)</p>
            </>
          )}
        </div>
        <div className="fit-container fx-centered">
          <input
            type="text"
            className="if ifs-full"
            placeholder="Image url..."
            value={thumbnailUrl}
            onChange={handleThumbnailValue}
          />
          <label
            htmlFor="image-up"
            className="fit-container fx-centered fx-col box-pad-h sc-s pointer bg-img cover-bg"
            style={{
              position: "relative",
              minHeight: "50px",
              minWidth: "50px",
              maxWidth: "50px",
            }}
          >
            <div className="upload-file-24"></div>
            <input
              type="file"
              id="image-up"
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                left: 0,
                top: 0,
                opacity: 0,
              }}
              value={thumbnail.fileName}
              onChange={handleImageUpload}
              // disabled={thumbnail}
              className="pointer"
              accept="image/jpg,image/png,image/gif"
            />
          </label>
        </div>
        <button
          className={`btn ${
            !thumbnail && !thumbnailUrl ? "btn-disabled" : "btn-normal"
          } btn-full`}
          onClick={save}
        >
          Save changes
        </button>
      </div>
    </div>
  );
};
