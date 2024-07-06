import React, { useContext, useState } from "react";
import heroNostr from "../../media/images/nostr-login.png";
import heroNostr2 from "../../media/images/nostr-login-2.png";
import { generatePrivateKey, getPublicKey } from "nostr-tools";
import { Context } from "../../Context/Context";
import {
  getBech32,
  shortenKey,
  getHex,
  getEmptyNostrUser,
} from "../../Helpers/Encryptions";
import * as secp from "@noble/secp256k1";
import { SimplePool } from "nostr-tools";
import relaysOnPlatform from "../../Content/Relays";
import LoadingDots from "../LoadingDots";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import { nostrPpPlaceholder } from "../../Content/NostrPPPlaceholder";
import ProfilePictureUploaderNOSTR from "./ProfilePictureUploaderNOSTR";
import { getEventHash, signEvent, relayInit } from "nostr-tools";
import hero from "../../media/images/end-init-hero.png";

const pool = new SimplePool();

export default function LoginNOSTR({ exit }) {
  const { setToast, setNostrUserData, setNostrKeysData, nostrKeys } =
    useContext(Context);
  const [login, setLogin] = useState(true);
  const [accountInit, setAccountInit] = useState(false);
  const [finishInit, setFinishInit] = useState(false);
  const [endInit, setEndInit] = useState(false);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const existScreen = () => {
    if (nostrKeys) {
      onLogin(nostrKeys.sec);
      exit();
      return;
    }
    exit();
    return;
  };

  const onLogin = async (inputKey) => {
    if (!inputKey) return;

    if (inputKey.startsWith("npub")) {
      try {
        let hex = getHex(inputKey);
        let user = await getUserFromNOSTR(hex);
        if (user) {
          setNostrUserData(user);
          setNostrKeysData({
            pub: hex,
          });
        }

        exit();
        return;
      } catch (err) {
        setToast({
          type: 2,
          desc: "Invalid public key!",
        });
      }
    }
    if (inputKey.startsWith("nsec")) {
      try {
        let hex = getHex(inputKey);
        if (secp.utils.isValidPrivateKey(hex)) {
          let user = await getUserFromNOSTR(getPublicKey(hex));
          if (user) {
            setNostrUserData(user);
            setNostrKeysData({
              sec: hex,
              pub: getPublicKey(hex),
            });
          }

          exit();
          return;
        }
      } catch (err) {
        setToast({
          type: 2,
          desc: "Invalid private key!",
        });
      }
    }
    if (secp.utils.isValidPrivateKey(inputKey)) {
      let user = await getUserFromNOSTR(getPublicKey(inputKey));
      if (user) {
        setNostrUserData(user);
        setNostrKeysData({
          sec: inputKey,
          pub: getPublicKey(inputKey),
        });
      }

      exit();
      return;
    }
    setToast({
      type: 2,
      desc: "Invalid private key!",
    });
  };
  const getUserFromNOSTR = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [pubkey],
      });

      return author || getEmptyNostrUser(pubkey);
    } catch (err) {
      console.log(err);
    }
  };
  const publish = async () => {
    setIsLoading(true);
    let prevUserData = await getUserFromNOSTR(nostrKeys.pub);
    let content = JSON.parse(prevUserData.content);
    content.name = name;
    let event = {
      kind: 0,
      pubkey: nostrKeys.pub,
      content: JSON.stringify(content),
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
    };
    event.id = getEventHash(event);
    event.sig = signEvent(event, nostrKeys.sec);

    let relaysToPublich = await Promise.all(
      relaysOnPlatform.map(async (url) => {
        try {
          let relay = relayInit(url);
          console.log(relay);
          var res = { url: url.split("wss://")[1], status: false };
          relay.on("connect", () => {
            let pub = relay.publish(event);
            pub.on("ok", () => {
              res.status = true;
            });
            pub.on("failed", () => {});
          });
          await relay.connect();
          return res;
        } catch (err) {
          return res;
        }
      })
    );
    if (relaysToPublich.find((item) => item.status)) {
      setIsLoading(false);
      setEndInit(true);
    } else {
      setIsLoading(false);
      setToast({
        type: 2,
        desc: "Failed to proceed to the next step!",
      });
    }
  };
  const skipName = () => {
    setEndInit(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2000,
      }}
      className="sign-in-screen fx-centered box-pad-h"
      onClick={(e) => {
        e.stopPropagation();
        existScreen();
      }}
    >
      <section
        className="fx-scattered sc-s nostr-login-container"
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{ height: "85vh", border: "none" }}
      >
        <div className="close" onClick={existScreen}>
          <div></div>
        </div>
        {endInit && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              backgroundImage: `url(${hero})`,
            }}
            className="fx-centered fx-end-v bg-img cover-bg"
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                zIndex: 0,
                background:
                  "linear-gradient(179.82deg, rgba(0, 0, 0, 0) 19.91%, #000000 113.18%)",
              }}
              className="fx-centered fx-end-v"
            ></div>
            <div
              className="fx-centered fx-col box-pad-h"
              style={{ height: "30vh", zIndex: 1, position: "relative" }}
            >
              <h3 className="white-c p-centered">Welcome to Yakihonne</h3>
              <p className="gray-c p-centered p-big box-pad-v-m">
                Enjoy the experience of owning your own data!
              </p>
              <button className="btn btn-normal" onClick={existScreen}>
                Let's go!
              </button>
            </div>
          </div>
        )}
        {!endInit && (
          <>
            {accountInit && (
              <>
                {!finishInit && (
                  <ProfilePictureUploaderNOSTR
                    exit={() => setFinishInit(true)}
                  />
                )}
                {finishInit && (
                  <div className="fit-container box-pad-h fx-centered fx-col">
                    <div
                      style={{ maxWidth: "380px" }}
                      className="fx-centered fx-wrap"
                    >
                      <h3 className="p-centered">Pick a username</h3>
                      <p className="gray-c box-pad-v-m p-centered">
                        You can change your name whenever you want, it is not
                        permanent and it is not unique.
                      </p>
                      <div className="fit-container fx-centered fx-col">
                        <input
                          type="text"
                          className="if ifs-full"
                          placeholder="Eg. Smart Nostrich"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                        <div className="fx-centered fx-end-h fit-container box-pad-v-m">
                          <button
                            className="btn-gst btn"
                            onClick={skipName}
                            disabled={isLoading}
                          >
                            {isLoading ? <LoadingDots /> : "Skip"}
                          </button>
                          <button
                            className="btn-normal btn"
                            onClick={publish}
                            disabled={isLoading}
                          >
                            {isLoading ? <LoadingDots /> : "Finish"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {!accountInit && (
              <>
                <div style={{ flex: "1 1 300px", padding: "2rem" }}>
                  {login && (
                    <Login
                      switchScreen={() => setLogin(false)}
                      exit={existScreen}
                    />
                  )}
                  {!login && (
                    <Signup
                      switchScreen={() => setLogin(true)}
                      continueSignup={() => setAccountInit(true)}
                    />
                  )}
                </div>
                <div
                  className="bg-img cover-bg login-screen-heros"
                  style={{
                    flex: "1 1 400px",
                    height: "100%",
                    backgroundImage: login
                      ? `url(${heroNostr})`
                      : `url(${heroNostr2})`,
                  }}
                ></div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

const Login = ({ switchScreen, exit }) => {
  const { setToast, setNostrUserData, setNostrKeysData } = useContext(Context);
  const [key, setKey] = useState("");
  const [checkExt, setCheckExt] = useState(window.nostr ? true : false);
  const [isLoading, setIsLoading] = useState(false);

  const onLogin = async (inputKey) => {
    if (!inputKey) return;
    setIsLoading(true);
    if (inputKey.startsWith("npub")) {
      try {
        let hex = getHex(inputKey);
        let user = await getUserFromNOSTR(hex);
        if (user) {
          setNostrUserData(user);
          setNostrKeysData({
            pub: hex,
          });
        }
        setIsLoading(false);
        exit();
        return;
      } catch (err) {
        setIsLoading(false);
        setToast({
          type: 2,
          desc: "Invalid public key!",
        });
      }
    }
    if (inputKey.startsWith("nsec")) {
      try {
        let hex = getHex(inputKey);
        if (secp.utils.isValidPrivateKey(hex)) {
          let user = await getUserFromNOSTR(getPublicKey(hex));
          if (user) {
            setNostrUserData(user);
            setNostrKeysData({
              sec: hex,
              pub: getPublicKey(hex),
            });
          }
          setIsLoading(false);
          exit();
          return;
        }
      } catch (err) {
        setIsLoading(false);
        setToast({
          type: 2,
          desc: "Invalid private key!",
        });
      }
    }
    if (secp.utils.isValidPrivateKey(inputKey)) {
      let user = await getUserFromNOSTR(getPublicKey(inputKey));
      if (user) {
        setNostrUserData(user);
        setNostrKeysData({
          sec: inputKey,
          pub: getPublicKey(inputKey),
        });
      }
      setIsLoading(false);
      exit();
      return;
    }
    setIsLoading(false);
    setToast({
      type: 2,
      desc: "Invalid private key!",
    });
  };

  const getUserFromNOSTR = async (pubkey) => {
    try {
      let author = await pool.get(relaysOnPlatform, {
        kinds: [0],
        authors: [pubkey],
      });

      return author || getEmptyNostrUser(pubkey);
    } catch (err) {
      console.log(err);
    }
  };

  const onLoginWithExt = async () => {
    try {
      setIsLoading(true);
      let key = await window.nostr.getPublicKey();
      let user = await getUserFromNOSTR(key);
      if (user) {
        setNostrUserData(user);
        setNostrKeysData({
          pub: key,
          ext: true,
        });
      }
      setIsLoading(false);
      exit();
      return;
    } catch (err) {
      setIsLoading(false);
      setToast({
        type: 2,
        desc: "Invalid public key!",
      });
    }
  };

  return (
    <div className="fit-container">
      <h3 className="box-pad-v">Login</h3>
      <p className="gray-c box-marg-s">Enter your key</p>
      <input
        type="text"
        className="if ifs-full box-marg-s"
        placeholder="npub, nsec, hex"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <p className="gray-c box-marg-s">
        Only the secret key can be used to publish (sign events), everything
        else logs you in read-only mode.
      </p>
      <div className="fx-centered fx-start-h box-pad-v">
        <button className="btn btn-normal" onClick={() => onLogin(key)}>
          {isLoading ? <LoadingDots /> : <>Login</>}
        </button>
        {checkExt && (
          <button
            className="btn btn-normal"
            disabled={!checkExt}
            onClick={onLoginWithExt}
          >
            {isLoading ? <LoadingDots /> : <>Login using an extension</>}
          </button>
        )}
        {!checkExt && (
          <button className="btn btn-disabled" disabled={true}>
            <>Login using an extension</>
          </button>
        )}
      </div>
      <div className="box-pad-v-s"></div>
      <h3 className="box-pad-v">Or create an account</h3>
      <p className="gray-c box-marg-s">
        Generate a public / private key pair. Do not share your private key with
        anyone, this acts as your password. Once lost, it cannot be “reset” or
        recovered. Keep safe!
      </p>
      <button className="btn btn-normal" onClick={switchScreen}>
        Generate keys{" "}
      </button>
    </div>
  );
};

const Signup = ({ switchScreen, continueSignup }) => {
  const { setToast, setNostrKeysData } = useContext(Context);
  let [sk, setSk] = useState(generatePrivateKey());
  let [pk, setPk] = useState(getPublicKey(sk));
  let [nsec, setSec] = useState(getBech32("nsec", sk));
  let [npub, setNpub] = useState(getBech32("npub", pk));

  const copyKey = (keyType, key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `${keyType} key was copied! 👏`,
    });
  };

  const initilizeAccount = () => {
    setNostrKeysData({
      pub: pk,
      sec: sk,
    });
    continueSignup();
  };

  return (
    <div className="fit-container">
      <h3 className="">Save your keys!</h3>
      <p className="gray-c box-pad-v">
        Your private key is your password. If you lose this key, you will lose
        access to your account! Copy it and keep it in a safe place. There is no
        way to reset your private key.
      </p>
      <p className="gray-c box-marg-s">Your secret key</p>
      <div
        className="fx-scattered if ifs-full box-marg-s pointer dashed-onH"
        style={{ borderStyle: "dashed" }}
        onClick={() => copyKey("Private", nsec)}
      >
        <p className="p-one-line" style={{ maxWidth: "400px" }}>
          {shortenKey(nsec)}
        </p>
        <div className="copy-24"></div>
      </div>
      <p className="gray-c box-marg-s">Your public key</p>
      <div
        className="fx-scattered if ifs-full box-marg-s pointer dashed-onH"
        style={{ borderStyle: "dashed" }}
        onClick={() => copyKey("Public", npub)}
      >
        <p className="p-one-line" style={{ maxWidth: "400px" }}>
          {shortenKey(npub)}
        </p>
        <div className="copy-24"></div>
      </div>
      <button className="btn btn-normal" onClick={initilizeAccount}>
        Keys are saved! Let me in!
      </button>
      <div className="box-pad-v-s"></div>
      <h3 className="box-pad-v">Or login</h3>
      <p className="gray-c box-marg-s">
        You can login now if you have created already an account or use an
        extension to access your account securely
      </p>
      <button className="btn btn-normal" onClick={switchScreen}>
        I have an account{" "}
      </button>
    </div>
  );
};
