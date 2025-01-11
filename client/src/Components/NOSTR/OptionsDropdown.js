import React, { Fragment, useEffect, useRef, useState } from "react";

export default function OptionsDropdown({ options }) {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);
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

  return (
    <div style={{ position: "relative" }} ref={optionsRef}>
      <div
        className="round-icon-small round-icon-tooltip"
        style={{ border: "none" }}
        data-tooltip="Options"
        onClick={() => {
          setShowOptions(!showOptions);
        }}
      >
        <div className="fx-centered fx-col" style={{ rowGap: 0 }}>
          <p className="gray-c fx-centered" style={{ height: "6px" }}>
            &#x2022;
          </p>
          <p className="gray-c fx-centered" style={{ height: "6px" }}>
            &#x2022;
          </p>
          <p className="gray-c fx-centered" style={{ height: "6px" }}>
            &#x2022;
          </p>
        </div>
      </div>
      {showOptions && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            backgroundColor: "var(--dim-gray)",
            border: "none",
            minWidth: "200px",
            width: "max-content",
            zIndex: 1000,
            rowGap: "12px",
          }}
          className="box-pad-h box-pad-v-m sc-s-18 fx-centered fx-col fx-start-v pointer"
        >
          {options.map((option, index) => {
            return <Fragment key={index} >{option}</Fragment>;
          })}
        </div>
      )}
    </div>
  );
}
