import React, { useEffect, useMemo, useRef, useState } from "react";

export default function Select({ options, value, disabled, setSelectedValue, defaultLabel = "-- Options --" }) {
  const [showOptions, setShowOptions] = useState(false);
  const selectedValue = useMemo(() => {
    return options.find((option) => option?.value === value);
  }, [value]);
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
    <div
      style={{ position: "relative", width: "fit-content" }}
      className="fit-container"
      ref={optionsRef}
    >
      <div
        className="fit-container fx-scattered if option pointer"
        style={{height: "48px", padding: "rem"}}
        onClick={() => (disabled ? null : setShowOptions(!showOptions))}
      >
        <p>{selectedValue?.display_name || defaultLabel}</p>
        <div className="arrow"></div>
      </div>
      {showOptions && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            border: "none",
            minWidth: "200px",
            width: "max-content",
            zIndex: 1000,
            rowGap: "0",
          }}
          className="sc-s-18 fx-centered fx-col fx-start-v pointer box-pad-v-s"
        >
          {options.map((option, index) => {
            return (
              <div
                key={index}
                className="option-no-scale fit-container fx-scattered sc-s-18 pointer box-pad-h-m"
                style={{
                  border: "none",
                  overflow: "visible",
                  borderRadius: 0,
                  padding: ".25rem 1rem",
                }}
                onClick={() => {
                  setSelectedValue(option?.value);
                  setShowOptions(false);
                }}
              >
                <div
                  className={
                    selectedValue?.value === option?.value ? "orange-c" : "gray-c"
                  }
                >
                  {option?.display_name}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

