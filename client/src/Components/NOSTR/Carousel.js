import React, { useState } from "react";
import ProgressBar from "../ProgressBar";

export default function Carousel({ imgs }) {
  const [currentImg, setCurrentImg] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);

  return (
    <>
      {showCarousel && (
        <CarouselItems
          imgs={imgs}
          selectedImage={currentImg}
          back={(e) => {
            e.stopPropagation();
            setShowCarousel(false);
          }}
        />
      )}
      <div
        className="fx-centered fx-start-h fx-wrap fit-container sc-s-18"
        style={{
          overflow: "hidden",
          marginTop: ".5rem",
          gap: "4px",
          border: "none",
        }}
      >
        {imgs.map((item, index) => {
          return (
            <div
              key={`${item}-${index}`}
              className={`bg-img cover-bg pointer fit-height `}
              style={{
                backgroundImage: `url(${item})`,
                flex: "1 1 170px",
                border: "none",
                aspectRatio: "16/9",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImg(index);
                setShowCarousel(true);
              }}
            ></div>
          );
        })}
      </div>
    </>
  );
}

const CarouselItems = ({ imgs, selectedImage, back }) => {
  const [currentImg, setCurrentImg] = useState(selectedImage);

  return (
    <div
      className="fixed-container fx-centered box-pad-h-s fx-col"
      onClick={back}
    >
      <div className="close">
        <div></div>
      </div>
      <div className="fit-container fx-scattered">
        <div
          className="pointer round-icon"
          style={{ position: "relative", zIndex: 100 }}
          onClick={(e) => {
            e.stopPropagation();
            currentImg > 0 && setCurrentImg(currentImg - 1);
          }}
        >
          <div className="arrow" style={{ transform: "rotate(90deg)" }}></div>
        </div>
        <div className=" fit-height" style={{ width: "90vw" }}>
          <div
            className="fit-container fit-height"
            style={{ overflow: "hidden" }}
          >
            <div
              className="fit-container fit-height fx-scattered fx-start-h"
              style={{
                transform: `translateX(-${currentImg * 100}%)`,
                transition: ".3s ease-in-out",
                zIndex: 0,
                position: "relative",
                columnGap: 0,
              }}
            >
              {imgs.map((item, index) => {
                return (
                  <div
                    key={index}
                    className="fit-container fx-centered fx-shrink box-pad-h-s box-pad-v-s"
                    style={{
                      height: "95vh",
                    }}
                  >
                    <img
                      src={item}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "object-contain",
                      }}
                      className="sc-s-18"
                    ></img>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div
          className="pointer round-icon"
          onClick={(e) => {
            e.stopPropagation();
            currentImg + 1 < imgs.length && setCurrentImg(currentImg + 1);
          }}
        >
          <div className="arrow" style={{ transform: "rotate(-90deg)" }}></div>
        </div>
      </div>
      <div className="fit-container fx-centered box-pad-h">
        <div style={{ width: "min(100%, 1000px)" }}>
          <ProgressBar
            current={currentImg + 1}
            total={imgs.length}
            full={true}
          />
        </div>
      </div>
    </div>
  );
};