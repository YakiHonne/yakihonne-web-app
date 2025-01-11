import axios from "axios";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  decodeUrlOrAddress,
  encodeLud06,
  shortenKey,
} from "../../Helpers/Encryptions";
import axiosInstance from "../../Helpers/HTTP_Client";
import UserProfilePicNOSTR from "./UserProfilePicNOSTR";
import QRCode from "react-qr-code";
import relaysOnPlatform from "../../Content/Relays";
import { getZapEventRequest } from "../../Helpers/NostrPublisher";
import { Context } from "../../Context/Context";
import { SimplePool } from "nostr-tools";
import LoadingDots from "../LoadingDots";
import LoginNOSTR from "./LoginNOSTR";
import { webln } from "@getalby/sdk";
import { decode } from "light-bolt11-decoder";
import { getWallets, updateWallets } from "../../Helpers/Helpers";

const pool = new SimplePool();

export default function ZapTip({
  recipientLNURL,
  recipientPubkey,
  senderPubkey,
  recipientInfo,
  aTag = "",
  eTag = "",
  forContent = "",
  onlyIcon = false,
  smallIcon = false,
  custom = false,
}) {
  const [callback, setCallback] = useState(false);
  const [showCashier, setCashier] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [lnbcAmount, setLnbcAmount] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (callback) return;
      try {
        if (recipientLNURL.startsWith("lnbc") && recipientLNURL.length > 24) {
          try {
            let decoded = decode(recipientLNURL);
            let lnbc = decoded.sections.find(
              (section) => section.name === "amount"
            );
            setLnbcAmount(lnbc);
            return;
          } catch (err) {
            console.log(err);
            return;
          }
        }
        const data = await axios.get(decodeUrlOrAddress(recipientLNURL));
        setCallback(data.data.callback);
      } catch (err) {
        console.error(err);
      }
    };
    if (!callback) fetchData();
  }, [recipientLNURL]);

  if (custom) {
    if (
      !recipientLNURL ||
      (!callback && !recipientLNURL.startsWith("lnbc")) ||
      (!lnbcAmount && recipientLNURL.startsWith("lnbc")) ||
      (!recipientPubkey && !recipientLNURL.startsWith("lnbc")) ||
      senderPubkey === recipientPubkey
    )
      return (
        <button
          className="btn btn-normal btn-full if-disabled"
          style={{
            color: custom.textColor,
            backgroundColor: custom.backgroundColor,
          }}
        >
          {custom.content}
        </button>
      );
    return (
      <>
        {showCashier && (
          <Cashier
            recipientLNURL={recipientLNURL}
            recipientPubkey={recipientPubkey}
            senderPubkey={senderPubkey}
            callback={callback}
            recipientInfo={recipientInfo}
            aTag={aTag}
            eTag={eTag}
            exit={() => setCashier(false)}
            forContent={forContent}
            lnbcAmount={lnbcAmount}
          />
        )}
        <button
          className="btn btn-normal btn-full"
          style={{
            color: custom.textColor,
            backgroundColor: custom.backgroundColor,
          }}
          onClick={() => setCashier(true)}
        >
          {custom.content}
        </button>
      </>
    );
  }

  if (
    !recipientLNURL ||
    !recipientPubkey ||
    !callback ||
    senderPubkey === recipientPubkey
  )
    return (
      <>
        {onlyIcon && (
          <div
            className={smallIcon ? "bolt" : "bolt-24"}
            style={{ opacity: ".2" }}
          ></div>
        )}
        {!onlyIcon && (
          <div
            className={`${
              smallIcon ? "round-icon-small" : "round-icon"
            }  round-icon-tooltip if-disabled`}
            data-tooltip="Zap"
          >
            <div
              className={smallIcon ? "lightning" : "lightning-24"}
              style={{ cursor: "not-allowed" }}
            ></div>
          </div>
        )}
      </>
    );
  if (!senderPubkey)
    return (
      <>
        {showLogin && <LoginNOSTR exit={() => setShowLogin(false)} />}
        {onlyIcon && (
          <div
            className={smallIcon ? "bolt" : "bolt-24"}
            onClick={() => setShowLogin(true)}
          ></div>
        )}
        {!onlyIcon && (
          <div
            className={`${
              smallIcon ? "round-icon-small" : "round-icon"
            }  round-icon-tooltip`}
            onClick={() => setShowLogin(true)}
            data-tooltip="Zap"
          >
            <div className={smallIcon ? "lightning" : "lightning-24"}></div>
          </div>
        )}
      </>
    );
  return (
    <>
      {showCashier && (
        <Cashier
          recipientLNURL={recipientLNURL}
          recipientPubkey={recipientPubkey}
          senderPubkey={senderPubkey}
          callback={callback}
          recipientInfo={recipientInfo}
          aTag={aTag}
          eTag={eTag}
          exit={() => setCashier(false)}
          forContent={forContent}
        />
      )}
      {onlyIcon && (
        <div
          className={smallIcon ? "bolt" : "bolt-24"}
          onClick={() => setCashier(true)}
        ></div>
      )}
      {!onlyIcon && (
        <div
          className={`${
            smallIcon ? "round-icon-small" : "round-icon"
          }  round-icon-tooltip`}
          data-tooltip="Zap"
          onClick={() => setCashier(true)}
        >
          <div className={smallIcon ? "lightning" : "lightning-24"}></div>
        </div>
      )}
    </>
  );
}

const Cashier = ({
  recipientLNURL,
  recipientPubkey,
  callback,
  recipientInfo,
  aTag,
  eTag,
  exit,
  forContent,
  lnbcAmount,
}) => {
  const {
    nostrKeys,
    setToast,
    nostrUser,
    setUpdatedActionFromYakiChest,
    updateYakiChestStats,
  } = useContext(Context);
  const [amount, setAmount] = useState(
    lnbcAmount ? parseInt(lnbcAmount.value) / 1000 : 1
  );
  const [message, setMessage] = useState("");
  const [invoice, setInvoice] = useState("");
  const [wallets, setWallets] = useState(getWallets());
  const [selectedWallet, setSelectedWallet] = useState(
    wallets.find((wallet) => wallet.active)
  );
  const [confirmation, setConfirmation] = useState("initiated");
  const [showWalletsList, setShowWalletList] = useState(false);
  const walletListRef = useRef(null);

  useEffect(() => {
    let handleOffClick = (e) => {
      if (walletListRef.current && !walletListRef.current.contains(e.target)) {
        setShowWalletList(false);
      }
    };

    document.addEventListener("mousedown", handleOffClick);
    return () => {
      document.removeEventListener("mousedown", handleOffClick);
    };
  }, [walletListRef]);

  const predefined_amounts = [
    { amount: 500, entitle: "500" },
    { amount: 1000, entitle: "1k" },
    { amount: 3000, entitle: "3k" },
    { amount: 5000, entitle: "5k" },
  ];

  const onConfirmation = async () => {
    try {
      if (!nostrKeys || !amount) {
        setToast({ type: 2, desc: "User is not connected or amount is null!" });
        return;
      }
      let lnbcInvoice = lnbcAmount ? recipientLNURL : "";
      if (!lnbcAmount) {
        let sats = amount * 1000;
        let tags = [
          ["relays", ...relaysOnPlatform],
          ["amount", sats.toString()],
          ["lnurl", recipientLNURL],
          ["p", recipientPubkey],
        ];
        if (aTag) tags.push(["a", aTag]);
        if (eTag) tags.push(["e", eTag]);
        const event = await getZapEventRequest(nostrKeys, message, tags);
        if (!event) {
          return;
        }
        let tempRecipientLNURL = recipientLNURL.includes("@")
          ? encodeLud06(decodeUrlOrAddress(recipientLNURL))
          : recipientLNURL;
        try {
          const res = await axios(
            `${callback}${
              callback.includes("?") ? "&" : "?"
            }amount=${sats}&nostr=${event}&lnurl=${tempRecipientLNURL}`
          );
          if (res.data.status === "ERROR") {
            setToast({
              type: 2,
              desc: "Something went wrong when processing payment!",
            });
            return;
          }
          lnbcInvoice = res.data.pr;
        } catch (err) {
          setToast({
            type: 2,
            desc: "Something went wrong when creating the invoice!",
          });
          return;
        }
      }
      setInvoice(lnbcInvoice);
      setConfirmation("in_progress");

      await sendPayment(lnbcInvoice);

      let sub = pool.subscribeMany(
        relaysOnPlatform,
        [
          {
            kinds: [9735],
            "#p": [recipientPubkey],
            since: Math.floor(Date.now() / 1000 - 10),
          },
        ],
        {
          onevent(event) {
            setConfirmation("confirmed");
            updateYakiChest();
          },
        }
      );
    } catch (err) {
      console.log(err);
    }
  };

  const sendPayment = async (addr) => {
    if (selectedWallet.kind === 1) sendWithWebLN(addr);
    if (selectedWallet.kind === 2) {
      let checkTokens = await checkAlbyToken(wallets, selectedWallet);
      setWallets(checkTokens.wallets);
      sendWithAlby(addr, checkTokens.activeWallet.data.access_token);
    }
    if (selectedWallet.kind === 3) sendWithNWC(addr);
  };

  const sendWithWebLN = async (addr_) => {
    try {
      await window.webln?.enable();
      let res = await window.webln.sendPayment(addr_);
      return;
    } catch (err) {
      if (err.includes("User rejected")) return;
      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };
  const sendWithNWC = async (addr_) => {
    try {
      const nwc = new webln.NWC({ nostrWalletConnectUrl: selectedWallet.data });
      await nwc.enable();
      const res = await nwc.sendPayment(addr_);
      nwc.close();
      return;
    } catch (err) {
      console.log(err);

      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };
  const sendWithAlby = async (addr_, code) => {
    try {
      const data = await axios.post(
        "https://api.getalby.com/payments/bolt11",
        { invoice: addr_ },
        {
          headers: {
            Authorization: `Bearer ${code}`,
          },
        }
      );
      return;
    } catch (err) {
      console.log(err);
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `LNURL was copied! 👏`,
    });
  };

  const updateYakiChest = async () => {
    try {
      let action_key = getActionKey();
      if (action_key) {
        let data = await axiosInstance.post("/api/v1/yaki-chest", {
          action_key,
        });
        console.log(data.data);
        let { user_stats, is_updated } = data.data;

        if (is_updated) {
          setUpdatedActionFromYakiChest(is_updated);
          updateYakiChestStats(user_stats);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getActionKey = () => {
    if (amount > 0 && amount <= 20) return "zap-1";
    if (amount <= 60) return "zap-20";
    if (amount <= 100) return "zap-60";
    if (amount > 100) return "zap-100";
    return false;
  };

  const handleSelectWallet = (walletID) => {
    // let walletID = e.target.value;
    let index = wallets.findIndex((wallet) => wallet.id == walletID);

    let tempWallets = Array.from(wallets);
    tempWallets = tempWallets.map((wallet) => {
      let w = { ...wallet };
      w.active = false;
      return w;
    });
    tempWallets[index].active = true;
    setSelectedWallet(wallets[index]);
    setWallets(tempWallets);
    setShowWalletList(false);
  };

  return (
    <div
      className="fixed-container fx-centered box-pad-h"
      onClick={(e) => {
        e.stopPropagation();
        exit();
      }}
    >
      <section
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="sc-s box-pad-h box-pad-v"
        style={{
          width: "min(100%, 500px)",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div
          className="close"
          onClick={(e) => {
            e.stopPropagation();
            exit();
          }}
        >
          <div></div>
        </div>
        <div className="fx-centered box-marg-s">
          <div className="fx-centered fx-col">
            <UserProfilePicNOSTR
              size={54}
              mainAccountUser={true}
              ring={false}
            />
            <p className="gray-c p-medium">{nostrUser.name}</p>
          </div>
          {recipientPubkey && (
            <>
              <div style={{ position: "relative", width: "30%" }}>
                {confirmation === "confirmed" && (
                  <div
                    className="checkmark slide-left"
                    style={{ scale: "3" }}
                  ></div>
                )}
                {confirmation !== "confirmed" && (
                  <div className="arrows-animated">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
              <div className="fx-centered fx-col">
                <UserProfilePicNOSTR
                  size={54}
                  img={recipientInfo.img || recipientInfo.picture}
                  mainAccountUser={false}
                  ring={false}
                />
                <p className="gray-c p-medium">{recipientInfo.name}</p>
              </div>
            </>
          )}
        </div>

        {confirmation === "initiated" && (
          <div className="fx-centered fx-col fit-container fx-start-v">
            {forContent && (
              <div className="fit-container sc-s-18 box-pad-h-m box-pad-v-m">
                <p>
                  <span className="gray-c">For </span>
                  {forContent}
                </p>
              </div>
            )}
            <div
              style={{ position: "relative" }}
              className="fit-container"
              ref={walletListRef}
            >
              {selectedWallet && (
                <div
                  className="if fx-scattered option pointer fit-container"
                  onClick={() => setShowWalletList(!showWalletsList)}
                >
                  <div>
                    <p className="gray-c p-medium">Send with</p>
                    <p>{selectedWallet.entitle}</p>
                  </div>
                  <div className="arrow"></div>
                </div>
              )}
              {showWalletsList && (
                <div
                  className="fx-centered fx-col sc-s-18  box-pad-v-s fx-start-v fx-start-h fit-container"
                  style={{
                    backgroundColor: "var(--c1-side)",
                    position: "absolute",
                    right: "0",
                    top: "calc(100% + 5px)",
                    rowGap: 0,
                    overflow: "scroll",
                    maxHeight: "300px",
                    zIndex: 100,
                  }}
                >
                  <p className="p-medium gray-c box-pad-h-m box-pad-v-s">
                    Connected wallets
                  </p>
                  {wallets.map((wallet) => {
                    return (
                      <div
                        key={wallet.id}
                        className="option-no-scale fit-container fx-scattered sc-s-18 pointer box-pad-h-m box-pad-v-s"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectWallet(wallet.id);
                        }}
                        style={{
                          border: "none",
                          overflow: "visible",
                        }}
                      >
                        <div className="fx-centered">
                          {wallet.active && (
                            <div
                              style={{
                                minWidth: "8px",
                                aspectRatio: "1/1",
                                backgroundColor: "var(--green-main)",
                                borderRadius: "var(--border-r-50)",
                              }}
                            ></div>
                          )}
                          <p className={wallet.active ? "green-c" : ""}>
                            {wallet.entitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {!lnbcAmount && (
              <>
                <div className="fit-container" style={{ position: "relative" }}>
                  <input
                    type="number"
                    className="if ifs-full"
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                  />
                  <div
                    className="fx-centered"
                    style={{ position: "absolute", right: "16px", top: "16px" }}
                  >
                    <p className="gray-c">sats</p>
                  </div>
                </div>
                <div className="fit-container fx-scattered">
                  {predefined_amounts.map((item, index) => {
                    return (
                      <button
                        className={`fx  btn sc-s-18 `}
                        key={index}
                        style={{
                          borderColor:
                            amount === item.amount ? "var(--black)" : "",
                          color: "var(--black)",
                        }}
                        onClick={() => setAmount(item.amount)}
                      >
                        {index === 1 && <span>🥳</span>}
                        {index === 2 && <span>🤩</span>}
                        {index === 3 && <span>🤯</span>}
                        {index === 0 && <span>😀</span>} {item.entitle}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="if ifs-full"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tip message (optional)"
                />
              </>
            )}
            <button
              className="btn btn-normal btn-full"
              onClick={onConfirmation}
            >
              {lnbcAmount ? `Pay ${amount} sats` : "Start confirmation"}
            </button>
          </div>
        )}
        {confirmation === "in_progress" && (
          <div className="fx-centered fx-col fit-container">
            <QRCode
              style={{ width: "100%", aspectRatio: "1/1" }}
              size={400}
              value={invoice}
            />
            <div
              className="fx-scattered if pointer dashed-onH fit-container box-marg-s"
              style={{ borderStyle: "dashed" }}
              onClick={() => copyKey(invoice)}
            >
              <p>{shortenKey(invoice)}</p>
              <div className="copy-24"></div>
            </div>
            <div className="fit-container fx-centered">
              <p className="gray-c p-medium">Waiting for response</p>
              <LoadingDots />
            </div>
          </div>
        )}
        {confirmation === "confirmed" && (
          <div
            className="fx-centered fx-col fit-container"
            style={{ height: "16vh" }}
          >
            <div className="box-pad-v-s"></div>
            <h4>Payment succeeded!</h4>
            <p className="gray-c box-pad-v-s">
              You have tipped <span className="orange-c">{amount}</span> sats
            </p>
            <button className="btn btn-normal" onClick={exit}>
              Done!
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

const checkAlbyToken = async (wallets, activeWallet) => {
  let tokenExpiry = activeWallet.data.created_at + activeWallet.data.expires_in;
  let currentTime = Math.floor(Date.now() / 1000);
  if (tokenExpiry > currentTime)
    return {
      wallets,
      activeWallet,
    };
  try {
    let fd = new FormData();
    fd.append("refresh_token", activeWallet.data.refresh_token);
    fd.append("grant_type", "refresh_token");
    const access_token = await axios.post(
      "https://api.getalby.com/oauth/token",
      fd,
      {
        auth: {
          username: process.env.REACT_APP_ALBY_CLIENT_ID,
          password: process.env.REACT_APP_ALBY_SECRET_ID,
        },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    let tempWallet = { ...activeWallet };
    tempWallet.data = {
      ...access_token.data,
      created_at: Math.floor(Date.now() / 1000),
    };
    let tempWallets = Array.from(wallets);
    let index = wallets.findIndex((item) => item.id === activeWallet.id);
    tempWallets[index] = tempWallet;
    updateWallets(tempWallets);
    return {
      wallets: tempWallets,
      activeWallet: tempWallet,
    };
  } catch (err) {
    console.log(err);
    return {
      wallets,
      activeWallet,
    };
  }
};
