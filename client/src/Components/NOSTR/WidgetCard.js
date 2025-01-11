import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../Context/Context";
import { nip19 } from "nostr-tools";
import OptionsDropdown from "./OptionsDropdown";
import { Link } from "react-router-dom";
import ShareLink from "../ShareLink";
import PreviewWidget from "../SmartWidget/PreviewWidget";
import AuthorPreview from "./AuthorPreview";
import PostNoteWithWidget from "./PostNoteWithWidget";

export default function WidgetCard({ widget, deleteWidget, options = true }) {
  const { nostrAuthors, getNostrAuthor, nostrKeys, setToast } =
    useContext(Context);
  const [authorData, setAuthorData] = useState(widget.author);
  const [postNoteWithWidgets, setPostNoteWithWidget] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let auth = getNostrAuthor(widget.author.pubkey);

        if (auth) {
          setAuthorData(auth);
        }
        return;
      } catch (err) {
        console.log(err);
      }
    };
    fetchData();
  }, [nostrAuthors]);

  const copyNaddr = () => {
    let naddr = nip19.naddrEncode({
      pubkey: widget.pubkey,
      identifier: widget.d,
      kind: widget.kind,
    });
    navigator?.clipboard?.writeText(naddr);
    setToast({
      type: 1,
      desc: `Naddr was copied! 👏`,
    });
  };

  return (
    <>
      {postNoteWithWidgets && (
        <PostNoteWithWidget
          widget={{
            ...widget,
            naddr: nip19.naddrEncode({
              pubkey: widget.pubkey,
              identifier: widget.d,
              kind: widget.kind,
            }),
          }}
          exit={() => setPostNoteWithWidget(false)}
        />
      )}

      <div
        className="box-pad-h-m box-pad-v-m sc-s-18 fx-centered fx-col fit-container fx-start-h fx-start-v"
        style={{ overflow: "visible" }}
      >
        <div className="fit-container fx-scattered">
          <AuthorPreview author={authorData} />
          {options && <OptionsDropdown
            options={[
              <div className="fit-container" onClick={copyNaddr}>
                <p>Copy naddr</p>
              </div>,
              <div
                className="fit-container"
                onClick={() => setPostNoteWithWidget(true)}
              >
                <p>Post widget in note</p>
              </div>,
              <Link
                className="fit-container"
                to={"/smart-widget-builder"}
                state={{ ops: "clone", metadata: { ...widget } }}
              >
                <p>Clone</p>
              </Link>,
              <Link
                className="fit-container"
                to={`/smart-widget-checker?naddr=${nip19.naddrEncode({
                  pubkey: widget.pubkey,
                  identifier: widget.d,
                  kind: widget.kind,
                })}`}
              >
                <p>Check validity</p>
              </Link>,
              deleteWidget && nostrKeys.pub === widget.pubkey && (
                <Link
                  className="fit-container"
                  to={"/smart-widget-builder"}
                  state={{ ops: "edit", metadata: { ...widget } }}
                >
                  <p>Edit</p>
                </Link>
              ),
              deleteWidget && nostrKeys.pub === widget.pubkey && (
                <div className="fit-container" onClick={deleteWidget}>
                  <p className="red-c">Delete</p>
                </div>
              ),
              <ShareLink
                label="Share widget"
                path={`/${nip19.naddrEncode({
                  pubkey: widget.pubkey,
                  identifier: widget.d,
                  kind: widget.kind,
                })}`}
                title={widget.title || widget.description}
                description={widget.description || widget.title}
              />,
            ]}
          />}
        </div>
        <PreviewWidget widget={widget.metadata} pubkey={widget.pubkey} />
        {(widget.title || widget.description) && (
          <div
            className="fx-centered fx-col fx-start-h fx-start-v fit-container "
            style={{ rowGap: 0 }}
          >
            <p>{widget.title || "Untitled"}</p>
            {widget.description && (
              <p className="gray-c p-medium">{widget.description}</p>
            )}
            {!widget.description && (
              <p className="gray-c p-italic p-medium">No description</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
