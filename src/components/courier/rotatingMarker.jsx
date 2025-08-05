// CourierRotatingMarker.jsx
import { OverlayView } from "@react-google-maps/api";

export const RotatingMarker = ({ position, heading = 0 }) => {
  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div
        style={{
          transform: `translate(-50%, -100%) rotate(${heading}deg)`,
          transformOrigin: "center bottom",
          width: 60,
          height: 60,
        }}
      >
        <img
          src="/courier.png"
          alt="courier"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      </div>
    </OverlayView>
  );
};
