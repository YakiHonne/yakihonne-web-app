import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLocation, useParams } from "react-router-dom";
import { getWallets, updateWallets } from "../../Helpers/Helpers";

export default function WalletAlby() {
  const location = useLocation();
  const navigateTo = useNavigate();
  const [code, setCode] = useState(false);

  useEffect(() => {
    const getMeData = async () => {
      try {
        let code = new URLSearchParams(location.search).get("code");
        if (!code) {
          setCode("");
          return;
        }
        let fd = new FormData();
        fd.append("code", code);
        fd.append("grant_type", "authorization_code");
        fd.append("redirect_uri", process.env.REACT_APP_ALBY_REDIRECT_URL);
        const access_token = await axios.post(
          "https://api.getalby.com/oauth/token",
          fd,
          {
            auth: {
              username: process.env.REACT_APP_ALBY_CLIENT_ID,
              password: process.env.REACT_APP_ALBY_SECRET_ID,
            },
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        const data = await axios.get("https://api.getalby.com/user/me", {
          headers: {
            Authorization: `Bearer ${access_token.data.access_token}`,
          },
        });

        let alby = {
          id: Date.now(),
          kind: 2,
          entitle: data.data.lightning_address,
          active: true,
          data: {
            ...access_token.data,
            created_at: Math.floor(Date.now() / 1000),
          },
        };

        let oldVersion = getWallets();
        if (oldVersion) {
          try {
            oldVersion = oldVersion.map((item) => {
              let updated_item = { ...item };
              updated_item.active = false;
              return updated_item;
            });
            oldVersion.push(alby);
            updateWallets(oldVersion);
            navigateTo("/wallet");
            return;
          } catch (err) {
            updateWallets([alby]);
            navigateTo("/wallet");
            return;
          }
        }
        updateWallets([alby]);
        navigateTo("/wallet");
      } catch (err) {
        console.log(err);
        navigateTo("/wallet");
      }
    };
    getMeData();
  }, []);

  if (code === false) return;
  if (code === "")
    return (
      <div className="fixed-container fx-centered fx-col">
        <h4>Link is broken :(</h4>
        <p className="gray-c p-centered" style={{ maxWidth: "300px" }}>
          There is something wrong with the link, we could not process your
          login
        </p>
        <Link to={"/"}>
          <button className="btn btn-normal btn-small">Get me back home</button>
        </Link>
      </div>
    );
}
