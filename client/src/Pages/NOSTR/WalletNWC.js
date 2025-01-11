import React, { useContext, useState } from "react";
import SidebarNOSTR from "../../Components/NOSTR/SidebarNOSTR";
import { webln } from "@getalby/sdk";
import { Link, useNavigate } from "react-router-dom";
import { Context } from "../../Context/Context";
import LoadingDots from "../../Components/LoadingDots";
import { getWallets, updateWallets } from "../../Helpers/Helpers";

export default function WalletNWC() {
  const { setToast } = useContext(Context);
  const navigateTo = useNavigate();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const addNWC = async () => {
    try {
      if (isLoading) return;
      setIsLoading(true);
      const nwc = new webln.NWC({ nostrWalletConnectUrl: url });
      await nwc.enable();
      const balanceResponse = await nwc.getBalance();
      let addr = new URLSearchParams(url).get("lud16");
      if (!addr) {
        setIsLoading(false);
        setToast({
          type: 2,
          desc: "Could not extract your lightning address.",
        });
        return;
      }
      let nwcNode = {
        id: Date.now(),
        kind: 3,
        entitle: addr,
        active: true,
        data: url,
      };

      let oldVersion = getWallets();
      if (oldVersion) {
        try {
          oldVersion = oldVersion.map((item) => {
            let updated_item = { ...item };
            updated_item.active = false;
            return updated_item;
          });
          oldVersion.push(nwcNode);
          updateWallets(oldVersion);
          navigateTo("/wallet");
          return;
        } catch (err) {
          updateWallets([nwcNode]);
          navigateTo("/wallet");
          return;
        }
      }
      updateWallets([nwcNode]);

      nwc.close();
      setIsLoading(false);
      navigateTo("/wallet");
    } catch (err) {
      console.log(err);
      setIsLoading(false);
      setToast({
        type: 2,
        desc: "Invalid input, please check your NWC URL",
      });
    }
  };

  return (
    <div>
      <div className="fit-container fx-centered">
        <div className="main-container">
          <SidebarNOSTR />
          <main className="main-page-nostr-container">
            <div className="fx-centered fit-container fx-start-h fx-start-v ">
              <div
                style={{ width: "min(100%, 600px)" }}
                className="box-pad-h-m box-pad-v"
              >
                <div className="fit-container fx-col fx-centered">
                  <Link
                    className="fx-centered fx-start-h fit-container"
                    to={"/wallet"}
                  >
                    <div className="round-icon">
                      <div className="arrow" style={{ rotate: "90deg" }}></div>
                    </div>
                  </Link>
                  <div className="fx-centered fx-col fx-start-h box-pad-v-m">
                    <h4>Nostr Wallet Connect</h4>
                    <p className="gray-c">
                      Add new wallet using Nostr Wallet Connect (NWC)
                    </p>
                  </div>
                  <input
                    type="text"
                    className="if ifs-full"
                    placeholder="nostr+walletconnect:<pubkey>?relay=<relay>&secret=<secret>"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="gray-c p-medium">
                    Using Alby? Go to{" "}
                    <a href="https://nwc.getalby.com" target="_blank">
                      nwc.getalby.com
                    </a>{" "}
                    to get your NWC config!
                  </p>
                  <button
                    className="btn btn-normal btn-full"
                    onClick={addNWC}
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingDots /> : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
