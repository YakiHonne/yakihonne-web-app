import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <div className="box-pad-h fx-scattered fx-wrap">
      <div className="fx-centered fx-wrap fx-start-h">
        <Link to={"/privacy"} target="_blank">
          <p className="p-medium gray-c">Privacy policies</p>
        </Link>
        <p className="p-small gray-c">&#9679;</p>
        <Link to={"/terms"} target="_blank">
          <p className="p-medium gray-c">Terms & conditions</p>
        </Link>
        <p className="p-small gray-c">&#9679;</p>
        <Link to={"/points-system"} target="_blank">
          <p className="p-medium gray-c">Points system</p>
        </Link>
        <p className="p-small gray-c">&#9679;</p>
        <Link to={"/yakihonne-smart-widgets"} target="_blank">
          <p className="p-medium gray-c">Smart widgets</p>
        </Link>
        <p className="p-small gray-c">&#9679;</p>
        <Link to={"/yakihonne-flash-news"} target="_blank">
          <p className="p-medium gray-c">About flash news</p>
        </Link>
        <p className="p-small gray-c">&#9679;</p>
        <Link to={"/yakihonne-mobile-app"} target="_blank">
          <p className="p-medium gray-c">Mobile app</p>
        </Link>
      </div>
      <div className="fx-centered fx-wrap fx-start-h">
        <p className="p-medium gray-c">
          All rights reserved. Yakihonne {new Date().getFullYear()}
        </p>
        <div className="fx-centered fx-wrap">
          <Link
            to={
              "/users/nprofile1qqszpxr0hql8whvk6xyv5hya7yxwd4snur4hu4mg5rctz2ehekkzrvcpr3mhxue69uhkummnw3ez6vp39eukz6mfdphkumn99e3k7mgpr3mhxue69uhkummnw3ez6vpj9eukz6mfdphkumn99e3k7mgpremhxue69uhkummnw3ez6vpn9ejx7unpveskxar0wfujummjvuq3gamnwvaz7tmjv4kxz7fwv3sk6atn9e5k7qg7waehxw309ahx7um5wgknqv3wv3hhyctxv93hgmmj0yhx7un8h5udgj"
            }
            target="_blank"
          >
            <div className="nostr-icon"></div>
          </Link>
          <p className="p-small gray-c">&#9679;</p>

          <a href="https://t.me/YakiHonne" target="_blank">
            <div className="msg-icon"></div>
          </a>
          <p className="p-small gray-c">&#9679;</p>

          <a href="https://t.me/YakiHonne_Daily_Featured/1" target="_blank">
            <div className="telegram-logo"></div>
          </a>

          <p className="p-small gray-c">&#9679;</p>

          <a href="https://twitter.com/YakiHonne" target="_blank">
            <div className="twitter-logo"></div>
          </a>
        </div>
      </div>
    </div>
  );
}
