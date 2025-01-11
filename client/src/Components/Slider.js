import React, { useEffect, useState, useRef } from "react";

export default function Slider({ items = [], slideBy = 10 }) {
  const [scrollPX, setScrollPX] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const noScrollBarContainer = useRef(null);
  const noScrollBarContainerMain = useRef(null);

  useEffect(() => {
    let carousel_container = noScrollBarContainerMain.current;
    let carousel = noScrollBarContainer.current;
    if (carousel_container.clientWidth < carousel.scrollWidth) {
      setShowArrows(true);
      setScrollPX(0);
    } else {
      setShowArrows(false);
      setScrollPX(0);
    }
  }, [items]);

  const slideRight = () => {
    let carousel_container = noScrollBarContainerMain.current;
    let carousel = noScrollBarContainer.current;

    let pxToSlide =
      scrollPX + slideBy < carousel.scrollWidth - carousel_container.clientWidth
        ? scrollPX + slideBy
        : carousel.scrollWidth - carousel_container.clientWidth;
    setScrollPX(pxToSlide);
  };
  const slideLeft = () => {
    let pxToSlide = scrollPX - slideBy > 0 ? scrollPX - slideBy : 0;
    setScrollPX(pxToSlide);
  };

  return (
    <div className="fit-container fx-scattered">
      {showArrows && (
        <div className="box-pad-h-s pointer slide-right" onClick={slideLeft}>
          <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
        </div>
      )}
      <div
        className="fx-centered fx-start-h no-scrollbar"
        style={{ overflow: "hidden" }}
        ref={noScrollBarContainerMain}
      >
        <div
          className="fx-centered fx-start-h no-scrollbar"
          style={{
            transform: `translateX(-${scrollPX}px)`,
            transition: ".3s ease-in-out",
            columnGap: "10px"
          }}
          ref={noScrollBarContainer}
        >
          {items.map((item, index) => {
            return <div key={index} style={{width: "max-content"}}>{item}</div>;
          })}
        </div>
      </div>

      {showArrows && (
        <div className="box-pad-h-s pointer slide-left" onClick={slideRight}>
          <div className="arrow" style={{ transform: "rotate(-90deg)" }}></div>
        </div>
      )}
    </div>
  );
}
