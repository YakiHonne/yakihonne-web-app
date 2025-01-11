import React, { useContext, useEffect, useRef, useState } from "react";
import { SimplePool } from "nostr-tools";
import { webln } from "@getalby/sdk";
import { Context } from "../../Context/Context";
import { Helmet } from "react-helmet";
import ArrowUp from "../../Components/ArrowUp";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import axios from "axios";
import Footer from "../../Components/Footer";
import SearchbarNOSTR from "../../Components/NOSTR/SearchbarNOSTR";
import HomeFN from "../../Components/NOSTR/HomeFN";
import PagePlaceholder from "../../Components/PagePlaceholder";
import * as secp from "@noble/secp256k1";
import SatsToUSD from "../../Components/NOSTR/SatsToUSD";
import {
  decodeBolt11,
  decodeUrlOrAddress,
  encodeLud06,
  filterRelays,
  getBech32,
  getBolt11,
  getEmptyNostrUser,
  getHex,
  getZapper,
  shortenKey,
} from "../../Helpers/Encryptions";
import relaysOnPlatform from "../../Content/Relays";
import UserProfilePicNOSTR from "../../Components/NOSTR/UserProfilePicNOSTR";
import Date_ from "../../Components/Date_";
import QRCode from "react-qr-code";
import LoadingDots from "../../Components/LoadingDots";
import { getZapEventRequest } from "../../Helpers/NostrPublisher";
import AddWallet from "../../Components/NOSTR/AddWallet";
import UserSearchBar from "../../Components/UserSearchBar";
import NProfilePreviewer from "../../Components/NOSTR/NProfilePreviewer";
import { getWallets, updateWallets } from "../../Helpers/Helpers";
const pool = new SimplePool();
const API_BASE_URL = process.env.REACT_APP_API_CACHE_BASE_URL;

export default function Wallet() {
  const {
    nostrKeys,
    nostrUser,
    addNostrAuthors,
    nostrAuthors,
    balance,
    setBalance,
  } = useContext(Context);
  const [importantFN, setImportantFN] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [displayMessage, setDisplayMessage] = useState(false);
  const [ops, setOps] = useState("");
  const [wallets, setWallets] = useState(getWallets());
  const [selectedWallet, setSelectedWallet] = useState(
    wallets.find((wallet) => wallet.active)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [showWalletsList, setShowWalletList] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [totalAmount, setTotalAmount] = useState([]);
  const [timestamp, setTimestamp] = useState(Date.now());

  const [showDeletionPopup, setShowDeletionPopup] = useState(false);
  const walletListRef = useRef(null);

  useEffect(() => {
    try {
      if (!nostrKeys) {
        setWallets([]);
        setSelectedWallet(false);
        return;
      }
      let tempWallets = getWallets();
      setWallets(tempWallets);
      setSelectedWallet(tempWallets.find((wallet) => wallet.active));
      let authors = [];
      let sub = pool.subscribeMany(
        nostrUser
          ? filterRelays(nostrUser?.relays || [], relaysOnPlatform)
          : relaysOnPlatform,
        [
          {
            kinds: [9735],
            "#p": [nostrKeys.pub],
          },
        ],
        {
          async onevent(event) {
            let sats = decodeBolt11(getBolt11(event));
            let zapper = getZapper(event);
            authors.push(zapper.pubkey);
            setTransactions((prev) => {
              return [...prev, zapper];
            });
            setTotalAmount((prev) => prev + sats);
          },
          oneose() {
            addNostrAuthors(authors);
          },
        }
      );
    } catch (err) {
      console.log(err);
      setIsLoaded(true);
    }
  }, [nostrKeys]);

  useEffect(() => {
    if (!nostrKeys) return;
    if (nostrKeys && (nostrKeys?.ext || nostrKeys?.sec)) {
      let tempWallets = getWallets();
      let selectedWallet_ = tempWallets.find((wallet) => wallet.active);
      if (selectedWallet_) {
        if (selectedWallet_.kind === 1) {
          getBalancWebLN();
        }
        if (selectedWallet_.kind === 2) {
          getAlbyData(selectedWallet_);
        }
        if (selectedWallet_.kind === 3) {
          getNWCData(selectedWallet_);
        }
      } else {
        setWallets([]);
        setSelectedWallet(false);
        setBalance("N/A");
      }
    } else {
      setBalance("N/A");
    }
  }, [nostrKeys, selectedWallet, timestamp]);

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

  const getBalancWebLN = async () => {
    try {
      setIsLoading(true);
      await window.webln.enable();
      let data = await window.webln.getBalance();

      setIsLoading(false);
      setBalance(data.balance);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const getAlbyData = async (activeWallet) => {
    try {
      setIsLoading(true);
      let checkTokens = await checkAlbyToken(wallets, activeWallet);
      let b = await getBalanceAlbyAPI(
        checkTokens.activeWallet.data.access_token
      );
      let t = await getTransactionsAlbyAPI(
        checkTokens.activeWallet.data.access_token
      );
      setWallets(checkTokens.wallets);
      setBalance(b);
      setWalletTransactions(t);
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };
  const getBalanceAlbyAPI = async (code) => {
    try {
      const data = await axios.get("https://api.getalby.com/balance", {
        headers: {
          Authorization: `Bearer ${code}`,
        },
      });
      return data.data.balance;
    } catch (err) {
      console.log(err);
      return 0;
    }
  };
  const getTransactionsAlbyAPI = async (code) => {
    try {
      const data = await axios.get("https://api.getalby.com/invoices", {
        headers: {
          Authorization: `Bearer ${code}`,
        },
      });
      let sendersMetadata = data.data
        .filter((event) => {
          if (event.metadata?.zap_request) return event;
        })
        .map((event) => {
          return event.metadata.zap_request.pubkey;
        });
      sendersMetadata = [...new Set(sendersMetadata)];
      addNostrAuthors(sendersMetadata);

      return data.data;
    } catch (err) {
      console.log(err);
      return 0;
    }
  };

  const getNWCData = async (activeWallet) => {
    try {
      setIsLoading(true);
      const nwc = new webln.NWC({ nostrWalletConnectUrl: activeWallet.data });
      await nwc.enable();
      const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

      const balance_ = await nwc.getBalance();
      setBalance(balance_.balance);
      const transactions_ = await nwc.listTransactions({
        from: Math.floor(new Date().getTime() / 1000 - ONE_WEEK_IN_SECONDS),
        until: Math.ceil(new Date().getTime() / 1000),
        limit: 50,
      });
      let sendersMetadata = transactions_.transactions
        .filter((event) => {
          if (event.metadata?.zap_request) return event;
        })
        .map((event) => {
          return event.metadata.zap_request.pubkey;
        });
      sendersMetadata = [...new Set(sendersMetadata)];
      addNostrAuthors(sendersMetadata);
      setWalletTransactions(transactions_.transactions);
      setIsLoading(false);
      nwc.close();
    } catch (err) {
      console.log(err);
      setIsLoading(false);
    }
  };

  const handleSelectWallet = (walletID) => {
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
    updateWallets(tempWallets);
    setOps("");
    setShowWalletList(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoaded(false);
        const [important] = await Promise.all([
          axios.get(API_BASE_URL + "/api/v1/mb/flashnews/important"),
        ]);
        setImportantFN(important.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, []);

  const handleDelete = () => {
    try {
      let tempWallets = wallets.filter(
        (wallet) => wallet.id !== showDeletionPopup.id
      );
      if (tempWallets.length > 0 && showDeletionPopup.active) {
        tempWallets[0].active = true;
        setWallets(tempWallets);
        setSelectedWallet(tempWallets[0]);
        setShowDeletionPopup(false);
        updateWallets(tempWallets);
        return;
      }

      setWallets(tempWallets);
      setShowDeletionPopup(false);
      if (tempWallets.length === 0) setSelectedWallet(false);
      updateWallets(tempWallets);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {showAddWallet && <AddWallet exit={() => setShowAddWallet(false)} />}
      {showDeletionPopup && (
        <DeletionPopUp
          exit={() => setShowDeletionPopup(false)}
          handleDelete={handleDelete}
        />
      )}
      <div>
        <Helmet>
          <title>Yakihonne | Wallet</title>
          <meta name="description" content="Manage your wallet" />
          <meta property="og:description" content="Manage your wallet" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="700" />
          <meta property="og:url" content={`https://yakihonne.com/wallet`} />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Yakihonne" />
          <meta property="og:title" content="Manage your wallet" />
          <meta property="twitter:title" content="Manage your wallet" />
          <meta property="twitter:description" content="Manage your wallet" />
        </Helmet>
        <div className="fit-container fx-centered">
          <div className="main-container">
            <SidebarNOSTR />
            <main className="main-page-nostr-container">
              <ArrowUp />
              <div className="fx-centered fit-container fx-start-h fx-start-v">
                <div style={{ flex: 1.5 }} className="box-pad-h-m">
                  {!(nostrKeys.ext || nostrKeys.sec) && (
                    <PagePlaceholder page={"nostr-wallet"} />
                  )}
                  {(nostrKeys.ext || nostrKeys.sec) && wallets.length === 0 && (
                    <PagePlaceholder page={"nostr-add-wallet"} />
                  )}
                  {(nostrKeys.ext || nostrKeys.sec) && wallets.length > 0 && (
                    <div>
                      <div
                        className="fit-container box-pad-v-m fx-scattered"
                        style={{ position: "relative", zIndex: 100 }}
                      >
                        <div>
                          <h4>Select your wallet</h4>
                        </div>
                        <div className="fx-centered">
                          <div
                            className="round-icon round-icon-tooltip"
                            data-tooltip="Add wallet"
                            onClick={() => setShowAddWallet(true)}
                          >
                            <div className="plus-sign"></div>
                          </div>
                          <div
                            style={{ position: "relative" }}
                            ref={walletListRef}
                          >
                            {selectedWallet && (
                              <div
                                className="if fx-scattered option pointer"
                                onClick={() =>
                                  setShowWalletList(!showWalletsList)
                                }
                              >
                                <p>{selectedWallet.entitle}</p>
                                <div className="arrow"></div>
                              </div>
                            )}
                            {showWalletsList && (
                              <div
                                className="fx-centered fx-col sc-s-18  box-pad-v-s fx-start-v"
                                style={{
                                  width: "400px",
                                  backgroundColor: "var(--c1-side)",
                                  position: "absolute",
                                  right: "0",
                                  top: "calc(100% + 5px)",
                                  rowGap: 0,
                                  overflow: "visible",
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
                                              backgroundColor:
                                                "var(--green-main)",
                                              borderRadius:
                                                "var(--border-r-50)",
                                            }}
                                          ></div>
                                        )}
                                        <p
                                          className={
                                            wallet.active ? "green-c" : ""
                                          }
                                        >
                                          {wallet.entitle}
                                        </p>
                                      </div>
                                      {wallet.kind !== 1 && (
                                        <div
                                          className="round-icon-small round-icon-tooltip"
                                          data-tooltip="Remove wallet"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowDeletionPopup(wallet);
                                          }}
                                        >
                                          <p className="p-medium red-c">
                                            &minus;
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className="fx-scattered box-pad-h fit-container  gradient-border fx-wrap"
                        style={{
                          position: "relative",
                          padding: "2rem",
                        }}
                      >
                        {!isLoading && (
                          <div className="fx-centered fx-col fx-start-v">
                            <h5>Balance</h5>
                            <div className="fx-centered">
                              <h2 className="orange-c">{balance}</h2>
                              <p className="gray-c">Sats</p>
                            </div>
                            <SatsToUSD sats={balance} />
                          </div>
                        )}
                        {isLoading && <LoadingDots />}
                        <div className="fx-centered">
                          <button
                            className={
                              selectedWallet
                                ? "btn btn-gray "
                                : "btn btn-disabled"
                            }
                            onClick={() =>
                              selectedWallet ? setOps("receive") : null
                            }
                            disabled={selectedWallet ? false : true}
                          >
                            Receive &#8601;
                          </button>
                          <button
                            className={
                              selectedWallet
                                ? "btn btn-orange "
                                : "btn btn-disabled"
                            }
                            onClick={() =>
                              selectedWallet ? setOps("send") : null
                            }
                            disabled={selectedWallet ? false : true}
                          >
                            Send &#8599;
                          </button>
                        </div>
                      </div>
                      {ops === "send" && (
                        <SendPayment
                          exit={() => setOps("")}
                          wallets={wallets}
                          selectedWallet={selectedWallet}
                          setWallets={setWallets}
                          refreshTransactions={() => setTimestamp(Date.now())}
                        />
                      )}
                      {ops === "receive" && (
                        <ReceivePayment
                          exit={() => setOps("")}
                          wallets={wallets}
                          selectedWallet={selectedWallet}
                          setWallets={setWallets}
                        />
                      )}
                      {isLoading && (
                        <div
                          className="fit-container fx-centered"
                          style={{ height: "40vh" }}
                        >
                          <p className="gray-c">Loading transactions</p>{" "}
                          <LoadingDots />
                        </div>
                      )}
                      {!isLoading && (
                        <>
                          {transactions.length > 0 &&
                            selectedWallet?.kind === 1 && (
                              <div className="fit-container box-pad-v fx-centered fx-col fx-start-v">
                                <p className="gray-c">
                                  Received payments from Nostr
                                </p>
                                {transactions.map((transaction) => {
                                  let author =
                                    nostrAuthors.find(
                                      (author) =>
                                        author.pubkey === transaction.pubkey
                                    ) || getEmptyNostrUser(transaction.pubkey);
                                  return (
                                    <div
                                      key={transaction.id}
                                      className="fit-container fx-scattered fx-col sc-s-18 box-pad-h-m box-pad-v-m"
                                      style={{
                                        border: "none",
                                        overflow: "visible",
                                      }}
                                    >
                                      <div className="fit-container fx-scattered">
                                        <div className="fx-centered fx-start-h">
                                          <div style={{ position: "relative" }}>
                                            <UserProfilePicNOSTR
                                              mainAccountUser={false}
                                              user_id={author.pubkey}
                                              size={48}
                                              img={author.picture}
                                              ring={false}
                                            />
                                            <div
                                              className="round-icon-small round-icon-tooltip"
                                              data-tooltip="Incoming"
                                              style={{
                                                position: "absolute",
                                                scale: ".65",
                                                backgroundColor:
                                                  "var(--pale-gray)",
                                                right: "-5px",
                                                bottom: "-10px",
                                              }}
                                            >
                                              <p className="green-c">&#8601;</p>
                                            </div>
                                          </div>
                                          <div>
                                            <p className="gray-c p-medium">
                                              On{" "}
                                              <Date_
                                                toConvert={
                                                  new Date(
                                                    transaction.created_at *
                                                      1000
                                                  )
                                                }
                                                time={true}
                                              />
                                            </p>
                                            <p className="p-medium">
                                              {author.display_name ||
                                                author.name ||
                                                author.pubkey.substring(
                                                  0,
                                                  10
                                                )}{" "}
                                              sent you
                                              <span className="orange-c">
                                                {" "}
                                                {transaction.amount}{" "}
                                                <span className="gray-c">
                                                  Sats
                                                </span>
                                              </span>
                                            </p>
                                          </div>
                                        </div>
                                        {transaction.message && (
                                          <div
                                            className="round-icon-small round-icon-tooltip"
                                            data-tooltip="Invoice message"
                                            onClick={() =>
                                              displayMessage === transaction.id
                                                ? setDisplayMessage(false)
                                                : setDisplayMessage(
                                                    transaction.id
                                                  )
                                            }
                                          >
                                            <div className="comment-not"></div>
                                          </div>
                                        )}
                                      </div>
                                      {transaction.message &&
                                        displayMessage === transaction.id && (
                                          <div
                                            className="fit-container sc-s box-pad-h-s box-pad-v-s p-medium"
                                            style={{
                                              backgroundColor: "var(--c1-side)",
                                              borderRadius: "var(--border-r-6)",
                                            }}
                                          >
                                            <p className="gray-c p-medium">
                                              Comment
                                            </p>
                                            <p className="p-medium">
                                              {transaction.message}
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          {transactions.length === 0 &&
                            selectedWallet?.kind === 1 && (
                              <div
                                className="fit-container fx-centered fx-col"
                                style={{ height: "30vh" }}
                              >
                                <h4>No transactions</h4>
                                <p className="gray-c">
                                  You have no received payments
                                </p>
                              </div>
                            )}
                          {walletTransactions.length > 0 &&
                            selectedWallet?.kind === 2 && (
                              <div className="fit-container box-pad-v fx-centered fx-col fx-start-v">
                                <p className="gray-c">Transactions</p>
                                {walletTransactions.map((transaction) => {
                                  let isZap = transaction.metadata?.zap_request;
                                  let author = isZap
                                    ? nostrAuthors.find(
                                        (author) =>
                                          author.pubkey ===
                                          transaction.metadata.zap_request
                                            .pubkey
                                      )
                                    : false;
                                  return (
                                    <div
                                      key={transaction.identifier}
                                      className="fit-container fx-scattered fx-col sc-s-18 box-pad-h-m box-pad-v-m"
                                      style={{
                                        border: "none",
                                        overflow: "visible",
                                      }}
                                    >
                                      <div className="fit-container fx-scattered">
                                        <div className="fx-centered fx-start-h">
                                          {(!isZap ||
                                            (isZap &&
                                              transaction.type ===
                                                "outgoing")) && (
                                            <>
                                              {transaction.type ===
                                                "outgoing" && (
                                                <div
                                                  className="round-icon round-icon-tooltip"
                                                  data-tooltip="Outgoing"
                                                >
                                                  <p className="red-c">
                                                    &#8599;
                                                  </p>
                                                </div>
                                              )}
                                              {transaction.type !==
                                                "outgoing" && (
                                                <div
                                                  className="round-icon round-icon-tooltip"
                                                  data-tooltip="Incoming"
                                                >
                                                  <p className="green-c">
                                                    &#8601;
                                                  </p>
                                                </div>
                                              )}
                                            </>
                                          )}
                                          {isZap &&
                                            transaction.type !== "outgoing" && (
                                              <>
                                                <div
                                                  style={{
                                                    position: "relative",
                                                  }}
                                                >
                                                  <UserProfilePicNOSTR
                                                    mainAccountUser={false}
                                                    size={48}
                                                    user_id={isZap.pubkey}
                                                    ring={false}
                                                    img={
                                                      author
                                                        ? author.picture
                                                        : ""
                                                    }
                                                  />
                                                  <div
                                                    className="round-icon-small round-icon-tooltip"
                                                    data-tooltip="Incoming"
                                                    style={{
                                                      position: "absolute",
                                                      scale: ".65",
                                                      backgroundColor:
                                                        "var(--pale-gray)",
                                                      right: "-5px",
                                                      bottom: "-10px",
                                                    }}
                                                  >
                                                    <p className="green-c">
                                                      &#8601;
                                                    </p>
                                                  </div>
                                                </div>
                                              </>
                                            )}
                                          <div>
                                            <p className="gray-c p-medium">
                                              On{" "}
                                              <Date_
                                                toConvert={
                                                  new Date(
                                                    transaction.creation_date *
                                                      1000
                                                  )
                                                }
                                                time={true}
                                              />
                                            </p>
                                            <p className="p-medium">
                                              {(!isZap ||
                                                (isZap &&
                                                  transaction.type ===
                                                    "outgoing")) && (
                                                <>
                                                  {transaction.type ===
                                                  "outgoing"
                                                    ? "You sent"
                                                    : "You received"}
                                                </>
                                              )}
                                              {(isZap ||
                                                (isZap &&
                                                  transaction.type !==
                                                    "outgoing")) && (
                                                <>
                                                  {`${
                                                    author
                                                      ? author.display_name ||
                                                        author.name
                                                      : getBech32(
                                                          "npub",
                                                          isZap.pubkey
                                                        ).substring(0, 10)
                                                  } sent you`}
                                                </>
                                              )}

                                              <span className="orange-c">
                                                {" "}
                                                {transaction.amount}{" "}
                                                <span className="gray-c">
                                                  Sats
                                                </span>
                                              </span>
                                            </p>
                                          </div>
                                        </div>
                                        {(transaction.memo ||
                                          transaction.comment) && (
                                          <div
                                            className="round-icon-small round-icon-tooltip"
                                            data-tooltip="Invoice message"
                                            onClick={() =>
                                              displayMessage ===
                                              transaction.identifier
                                                ? setDisplayMessage(false)
                                                : setDisplayMessage(
                                                    transaction.identifier
                                                  )
                                            }
                                          >
                                            <div className="comment-not"></div>
                                          </div>
                                        )}
                                      </div>
                                      {(transaction.memo ||
                                        transaction.comment) &&
                                        displayMessage ===
                                          transaction.identifier && (
                                          <div
                                            className="fit-container sc-s box-pad-h-s box-pad-v-s p-medium"
                                            style={{
                                              backgroundColor: "var(--c1-side)",
                                              borderRadius: "var(--border-r-6)",
                                            }}
                                          >
                                            <p className="gray-c p-medium">
                                              Comment
                                            </p>
                                            <p className="p-medium">
                                              {transaction.memo ||
                                                transaction.comment}
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          {walletTransactions.length === 0 &&
                            selectedWallet?.kind === 2 && (
                              <div
                                className="fit-container fx-centered fx-col"
                                style={{ height: "30vh" }}
                              >
                                <h4>No transactions</h4>
                                <p className="gray-c p-centered">
                                  We did not find any transactions related to
                                  this wallet
                                </p>
                              </div>
                            )}
                          {walletTransactions.length > 0 &&
                            selectedWallet?.kind === 3 && (
                              <div className="fit-container box-pad-v fx-centered fx-col fx-start-v">
                                <p className="gray-c">Transactions</p>
                                {walletTransactions.map(
                                  (transaction, index) => {
                                    let isZap =
                                      transaction.metadata?.zap_request;
                                    let author = isZap
                                      ? nostrAuthors.find(
                                          (author) =>
                                            author.pubkey ===
                                            transaction.metadata.zap_request
                                              .pubkey
                                        )
                                      : false;
                                    return (
                                      <div
                                        key={`${transaction.invoice}-${index}`}
                                        className="fit-container fx-scattered fx-col sc-s-18 box-pad-h-m box-pad-v-m"
                                        style={{
                                          border: "none",
                                          overflow: "visible",
                                        }}
                                      >
                                        <div className="fit-container fx-scattered">
                                          <div className="fx-centered fx-start-h">
                                            {(!isZap ||
                                              (isZap &&
                                                transaction.type ===
                                                  "outgoing")) && (
                                              <>
                                                {transaction.type ===
                                                  "outgoing" && (
                                                  <div
                                                    className="round-icon round-icon-tooltip"
                                                    data-tooltip="Outgoing"
                                                  >
                                                    <p className="red-c">
                                                      &#8599;
                                                    </p>
                                                  </div>
                                                )}
                                                {transaction.type !==
                                                  "outgoing" && (
                                                  <div
                                                    className="round-icon round-icon-tooltip"
                                                    data-tooltip="Incoming"
                                                  >
                                                    <p className="green-c">
                                                      &#8601;
                                                    </p>
                                                  </div>
                                                )}
                                              </>
                                            )}
                                            {isZap &&
                                              transaction.type !==
                                                "outgoing" && (
                                                <>
                                                  <div
                                                    style={{
                                                      position: "relative",
                                                    }}
                                                  >
                                                    <UserProfilePicNOSTR
                                                      mainAccountUser={false}
                                                      size={48}
                                                      user_id={isZap.pubkey}
                                                      ring={false}
                                                      img={
                                                        author
                                                          ? author.picture
                                                          : ""
                                                      }
                                                    />
                                                    <div
                                                      className="round-icon-small round-icon-tooltip"
                                                      data-tooltip="Incoming"
                                                      style={{
                                                        position: "absolute",
                                                        scale: ".65",
                                                        backgroundColor:
                                                          "var(--pale-gray)",
                                                        right: "-5px",
                                                        bottom: "-10px",
                                                      }}
                                                    >
                                                      <p className="green-c">
                                                        &#8601;
                                                      </p>
                                                    </div>
                                                  </div>
                                                </>
                                              )}
                                            <div>
                                              <p className="gray-c p-medium">
                                                On{" "}
                                                <Date_
                                                  toConvert={
                                                    new Date(
                                                      transaction.created_at *
                                                        1000
                                                    )
                                                  }
                                                  time={true}
                                                />
                                              </p>
                                              <p className="p-medium">
                                                {(!isZap ||
                                                  (isZap &&
                                                    transaction.type ===
                                                      "outgoing")) && (
                                                  <>
                                                    {transaction.type ===
                                                    "outgoing"
                                                      ? "You sent"
                                                      : "You received"}
                                                  </>
                                                )}
                                                {(isZap ||
                                                  (isZap &&
                                                    transaction.type !==
                                                      "outgoing")) && (
                                                  <>
                                                    {`${
                                                      author
                                                        ? author.display_name ||
                                                          author.name
                                                        : getBech32(
                                                            "npub",
                                                            isZap.pubkey
                                                          ).substring(0, 10)
                                                    } sent you`}
                                                  </>
                                                )}

                                                <span className="orange-c">
                                                  {" "}
                                                  {transaction.amount}{" "}
                                                  <span className="gray-c">
                                                    Sats
                                                  </span>
                                                </span>
                                              </p>
                                            </div>
                                          </div>
                                          {transaction.description && (
                                            <div
                                              className="round-icon-small round-icon-tooltip"
                                              data-tooltip="Invoice message"
                                              onClick={() =>
                                                displayMessage ===
                                                transaction.invoice
                                                  ? setDisplayMessage(false)
                                                  : setDisplayMessage(
                                                      transaction.invoice
                                                    )
                                              }
                                            >
                                              <div className="comment-not"></div>
                                            </div>
                                          )}
                                        </div>
                                        {transaction.description &&
                                          displayMessage ===
                                            transaction.invoice && (
                                            <div
                                              className="fit-container sc-s box-pad-h-s box-pad-v-s p-medium"
                                              style={{
                                                backgroundColor:
                                                  "var(--c1-side)",
                                                borderRadius:
                                                  "var(--border-r-6)",
                                              }}
                                            >
                                              <p className="gray-c p-medium">
                                                Comment
                                              </p>
                                              <p className="p-medium">
                                                {transaction.description}
                                              </p>
                                            </div>
                                          )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          {walletTransactions.length === 0 &&
                            selectedWallet?.kind === 3 && (
                              <div
                                className="fit-container fx-centered fx-col"
                                style={{ height: "30vh" }}
                              >
                                <h4>No transactions</h4>
                                <p className="gray-c p-centered">
                                  We did not find any transactions related to
                                  this wallet
                                </p>
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div
                  className=" fx-centered fx-col fx-start-v extras-homepage"
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: "100",
                    flex: 1,
                  }}
                >
                  <div className="sticky fit-container">
                    <SearchbarNOSTR />
                  </div>
                  <div
                    className=" fit-container sc-s-18 box-pad-h box-pad-v fx-centered fx-col fx-start-v box-marg-s"
                    style={{
                      backgroundColor: "var(--c1-side)",
                      rowGap: "24px",
                      border: "none",
                    }}
                  >
                    <h4>Important Flash News</h4>
                    <HomeFN flashnews={importantFN} />
                  </div>
                  <Footer />
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

const SendPayment = ({
  exit,
  wallets,
  selectedWallet,
  setWallets,
  refreshTransactions,
}) => {
  const { nostrKeys, setToast } = useContext(Context);
  const [isZap, setIsZap] = useState(false);
  const [invoiceData, setInvoicedata] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [addr, setAddr] = useState("");
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState(0);
  const [pubkey, setPubkey] = useState("");

  useEffect(() => {
    if (addr.startsWith("lnbc")) {
      setInvoicedata(false);
    } else setInvoicedata(true);
  }, [addr]);

  const sendWithWebLN = async (addr_) => {
    try {
      setIsLoading(true);
      await window.webln.enable();
      let res = await window.webln.sendPayment(addr_);
      setToast({
        type: 1,
        desc: `Successfully sent ${res.route.total_amt} sats, with ${res.route.total_fees} fees`,
      });
      reInitParams();
      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      if (err.includes("User rejected")) return;
      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };
  const sendWithNWC = async (addr_) => {
    try {
      setIsLoading(true);
      const nwc = new webln.NWC({ nostrWalletConnectUrl: selectedWallet.data });
      await nwc.enable();
      const res = await nwc.sendPayment(addr_);

      setToast({
        type: 1,
        desc: `Successfully sent.`,
      });
      reInitParams();
      setIsLoading(false);
      nwc.close();
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      if (err.includes("User rejected")) return;
      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };
  const sendWithAlby = async (addr_, code) => {
    try {
      setIsLoading(true);
      const data = await axios.post(
        "https://api.getalby.com/payments/bolt11",
        { invoice: addr_ },
        {
          headers: {
            Authorization: `Bearer ${code}`,
          },
        }
      );
      setIsLoading(false);
      reInitParams();
      refreshTransactions();
      setToast({
        type: 1,
        desc: `Successfully sent ${data.data.amount} sats, with ${data.data.fee} fees`,
      });
      return data.data;
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      setToast({
        type: 2,
        desc: `An error occured while making the transactions`,
      });
      return 0;
    }
  };
  const handleSendPayment = async () => {
    if (isLoading) return;
    if (invoiceData) {
      try {
        let hex = pubkey;
        if (amount === 0) {
          setToast({
            type: 3,
            desc: "The amount needs to be more than 0.",
          });
          return;
        }
        if (isZap && !pubkey) {
          setToast({
            type: 3,
            desc: "pubkey is missing",
          });
          return;
        }
        if (pubkey.startsWith("npub")) {
          hex = getHex(pubkey);
          if (!hex) {
            setToast({
              type: 3,
              desc: "pubkey's format is invalid.",
            });
            return;
          }
        }
        if (
          pubkey &&
          !pubkey.startsWith("npub") &&
          !secp.utils.isValidPrivateKey(pubkey)
        ) {
          setToast({
            type: 3,
            desc: "pubkey's format is invalid.",
          });
          return;
        }
        const data = await axios.get(decodeUrlOrAddress(addr));
        const callback = data.data.callback;
        let addr_ = encodeLud06(decodeUrlOrAddress(addr));
        let sats = amount * 1000;
        let event = getEvent(sats, addr_, hex);
        const res = isZap
          ? await axios(
              `${callback}?amount=${sats}&nostr=${event}&lnurl=${addr_}`
            )
          : await axios(`${callback}?amount=${sats}&lnurl=${addr_}`);

        if (selectedWallet.kind === 1) {
          sendWithWebLN(res.data.pr);
        }
        if (selectedWallet.kind === 2) {
          let checkTokens = await checkAlbyToken(wallets, selectedWallet);
          setWallets(checkTokens.wallets);
          sendWithAlby(addr_, checkTokens.activeWallet.data.access_token);
        }
        if (selectedWallet.kind === 3) {
          sendWithNWC(res.data.pr);
        }
      } catch (err) {
        console.log(err);
        setToast({
          type: 2,
          desc: "An error occured while parsing your address",
        });
      }
    }
    if (!invoiceData) {
      if (selectedWallet.kind === 1) sendWithWebLN(addr);
      if (selectedWallet.kind === 2) {
        let checkTokens = await checkAlbyToken(wallets, selectedWallet);
        setWallets(checkTokens.wallets);
        sendWithAlby(addr, checkTokens.activeWallet.data.access_token);
      }
      if (selectedWallet.kind === 3) sendWithNWC(addr);
    }
  };
  const reInitParams = () => {
    setIsZap(false);
    setInvoicedata(true);
    setAddr("");
    setComment("");
    setAmount(0);
    setPubkey("");
  };
  const getEvent = async (sats, addr_, hex) => {
    let tags = [
      ["relays", ...relaysOnPlatform],
      ["amount", sats.toString()],
      ["lnurl", addr_],
      ["p", hex],
    ];

    const event = isZap
      ? await getZapEventRequest(nostrKeys, comment, tags)
      : {};
    return event;
  };

  const handleUserMetadata = (data) => {
    if (data.lud16) {
      setAddr(data.lud16);
    }
  };

  return (
    <div
      className="fit-container fx-centered fx-col fx-start-v slide-up"
      style={{ marginTop: "1rem" }}
    >
      <div className="fit-container fx-scattered">
        <h4>Send</h4>
        <div className="close" style={{ position: "static" }} onClick={exit}>
          <div></div>
        </div>
      </div>

      <div
        className="fx-scattered fit-container if pointer"
        onClick={() => {
          setInvoicedata(!invoiceData);
          setAddr("");
        }}
      >
        <p>Use invoice</p>
        <div
          className={`toggle ${invoiceData ? "toggle-dim-gray" : ""} ${
            !invoiceData ? "toggle-c1" : "toggle-dim-gray"
          }`}
        ></div>
      </div>

      <input
        type="text"
        className="if ifs-full"
        placeholder={!invoiceData ? "Invoice" : "Lightning address"}
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
      />
      {invoiceData && (
        <input
          type="number"
          className="if ifs-full"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(Math.abs(parseInt(e.target.value)))}
        />
      )}

      {invoiceData && (
        <>
          {!pubkey && (
            <UserSearchBar
              onClick={setPubkey}
              full={true}
              placeholder="Search user to send as zap (optional)"
            />
          )}
          {pubkey && (
            <NProfilePreviewer
              pubkey={pubkey}
              margin={false}
              close={true}
              showSharing={false}
              onClose={() => setPubkey("")}
              setMetataData={handleUserMetadata}
            />
          )}
        </>
      )}
      {invoiceData && (
        <input
          type="text"
          className="if ifs-full"
          placeholder="Message (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      )}
      <button
        className="btn btn-orange btn-full"
        onClick={handleSendPayment}
        disabled={isLoading}
      >
        {isLoading ? <LoadingDots /> : "Send"}
      </button>
    </div>
  );
};

const ReceivePayment = ({ exit, wallets, selectedWallet, setWallets }) => {
  const { setToast } = useContext(Context);
  const [comment, setComment] = useState("");
  const [amount, setAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceRequest, setInvoiceRequest] = useState(false);

  const generateWithWebLN = async () => {
    try {
      setIsLoading(true);
      await window.webln.enable();
      let invoice = await window.webln.makeInvoice({
        defaultMemo: comment,
        amount,
      });
      setIsLoading(false);
      setInvoiceRequest(invoice.paymentRequest);
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      if (err.includes("User rejected")) return;
      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };
  const generateWithNWC = async () => {
    try {
      setIsLoading(true);
      const nwc = new webln.NWC({ nostrWalletConnectUrl: selectedWallet.data });
      await nwc.enable();
      const invoice = await nwc.makeInvoice({
        defaultMemo: comment,
        amount,
      });
      setIsLoading(false);
      setInvoiceRequest(invoice.paymentRequest);
      nwc.close();
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      if (err.includes("User rejected")) return;
      setToast({
        type: 2,
        desc: "An error has occured",
      });
    }
  };

  const generateWithAlby = async (code) => {
    try {
      setIsLoading(true);
      const data = await axios.post(
        "https://api.getalby.com/invoices",
        { amount, comment, description: comment, memo: comment },
        {
          headers: {
            Authorization: `Bearer ${code}`,
          },
        }
      );
      setIsLoading(false);
      setInvoiceRequest(data.data.payment_request);
      return data.data;
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      return 0;
    }
  };

  const generateInvoice = async () => {
    if (isLoading) return;
    if (selectedWallet.kind === 1) {
      generateWithWebLN();
    }
    if (selectedWallet.kind === 2) {
      let checkTokens = await checkAlbyToken(wallets, selectedWallet);
      setWallets(checkTokens.wallets);
      generateWithAlby(checkTokens.activeWallet.data.access_token);
    }
    if (selectedWallet.kind === 3) {
      generateWithNWC();
    }
  };

  const copyKey = (key) => {
    navigator.clipboard.writeText(key);
    setToast({
      type: 1,
      desc: `LNURL was copied! 👏`,
    });
  };

  return (
    <>
      {invoiceRequest && (
        <div className="fixed-container fx-centered box-pad-h">
          <div
            className="fx-centered fx-col sc-s-18"
            style={{ width: "min(100%, 500px)" }}
          >
            <QRCode
              style={{ width: "100%", aspectRatio: "1/1" }}
              size={500}
              value={invoiceRequest}
            />
            <div className="fx-centered fit-container">
              <div
                className="fx-scattered if pointer dashed-onH fit-container"
                style={{ borderStyle: "dashed" }}
                onClick={() => copyKey(invoiceRequest)}
              >
                <p>{shortenKey(invoiceRequest)}</p>
                <div className="copy-24"></div>
              </div>
              <button
                className="btn btn-normal"
                onClick={() => setInvoiceRequest("")}
              >
                exit
              </button>
            </div>
          </div>
        </div>
      )}
      <div
        className="fit-container fx-centered fx-col fx-start-v slide-up"
        style={{ marginTop: "1rem" }}
      >
        <div className="fit-container fx-scattered">
          <h4>Generate invoice</h4>
          <div className="close" style={{ position: "static" }} onClick={exit}>
            <div></div>
          </div>
        </div>
        <input
          type="text"
          className="if ifs-full"
          placeholder="Message (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <input
          type="number"
          className="if ifs-full"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(Math.abs(parseInt(e.target.value)))}
        />
        <button
          className="btn btn-orange btn-full"
          onClick={generateInvoice}
          disabled={isLoading}
        >
          {isLoading ? <LoadingDots /> : "Generate invoice"}
        </button>
      </div>
    </>
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

const DeletionPopUp = ({ exit, handleDelete }) => {
  return (
    <section className="fixed-container fx-centered box-pad-h">
      <section
        className="fx-centered fx-col sc-s box-pad-h box-pad-v"
        style={{ width: "450px" }}
      >
        <div
          className="fx-centered box-marg-s"
          style={{
            minWidth: "54px",
            minHeight: "54px",
            borderRadius: "var(--border-r-50)",
            backgroundColor: "var(--red-main)",
          }}
        >
          <div className="warning"></div>
        </div>
        <h3 className="p-centered">Delete wallet?</h3>
        <p className="p-centered gray-c box-pad-v-m">
          You're about to delete this wallet, do you wish to proceed?
        </p>
        <div className="fx-centered fit-container">
          <button className="fx btn btn-gst-red" onClick={handleDelete}>
            delete
          </button>
          <button className="fx btn btn-red" onClick={exit}>
            cancel
          </button>
        </div>
      </section>
    </section>
  );
};
