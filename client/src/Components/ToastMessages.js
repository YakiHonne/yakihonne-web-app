import React from "react";
import { useEffect } from "react";
import { useContext } from "react";
import { Context } from "../Context/Context";

export default function ToastMessages() {
  const { toast, setToast } = useContext(Context);
  const { desc, type } = toast || {};
  
  useEffect(() => {
    let timeout = setTimeout(() => {
      setToast(false);
    }, 4000);
    return () => {
      clearTimeout(timeout);
    };
  }, [toast]);

  const close = () => {
    setToast(false);
  };

  if (type === 1)
    return (
      <div className="toast-message success-toast fx-scattered popout">
        <div className="fx-centered">
          <div className="icon">
            <div className="success"></div>
          </div>
          <p className="p-medium">{desc}</p>
        </div>
        <div className="close-toast" onClick={close}>
          <p>&#10005;</p>
        </div>
      </div>
    );
  if (type === 2)
    return (
      <div className="toast-message fail-toast fx-scattered popout">
        <div className="fx-centered">
          <div className="icon">
            <div className="warning"></div>
          </div>
          <p className="p-medium">{desc}</p>
        </div>
        <div className="close-toast" onClick={close}>
          <p>&#10005;</p>
        </div>
      </div>
    );
  if (type === 3)
    return (
      <div className="toast-message warning-toast fx-scattered popout">
        <div className="fx-centered">
          <div className="icon">
            <div className="warning"></div>
          </div>
          <p className="p-medium">{desc}</p>
        </div>
        <div className="close-toast" onClick={close}>
          <p>&#10005;</p>
        </div>
      </div>
    );
}
