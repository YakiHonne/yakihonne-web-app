import React, { useState } from "react";
import PreviewWidget from "./PreviewWidget";

export default function MinimalPreviewWidget({ widget }) {
  const [showFullWidget, setShowFullWidget] = useState(false);
  return (
    <>
      {showFullWidget && (
        <FullWidget widget={widget} exit={() => setShowFullWidget(false)} />
      )}
      <div className="fit-container fx-scattered sc-s-18 box-pad-h-m box-pad-v-m">
        <div className="fx-centered fx-col fx-start-h fx-start-v">
          <p>{widget?.title}</p>
          {widget.description && (
            <p className="gray-c p-medium">{widget.description}</p>
          )}
        </div>
        <button
          className="btn btn-normal btn-small"
          onClick={() => setShowFullWidget(true)}
        >
          View
        </button>
      </div>
    </>
  );
}

const FullWidget = ({ widget, exit }) => {
  return (
    <div className="fixed-container box-pad-h fx-centered">
      <div
        style={{
          width: "min(100%, 600px)",
          maxHeight: "95vh",
          overflow: "scroll",
          backgroundColor: "var(--white)"
        }}
        className="box-pad-h-m sc-s-18"
      >
        <div className="sticky fit-container fx-scattered">
          <h4>{widget?.title}</h4>
          <div className="close" style={{ position: "static" }} onClick={exit}>
            <div></div>
          </div>
        </div>
        <div className="fit-container box-marg-s">
          <PreviewWidget widget={widget?.metadata} />
        </div>
      </div>
    </div>
  );
};
