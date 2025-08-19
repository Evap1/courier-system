import { useEffect } from "react";
import { motion } from "framer-motion";
import { FaMoneyBillAlt, FaRoute } from "react-icons/fa";
import { MdNavigation } from "react-icons/md";
import confetti from "canvas-confetti";

const variants = {
  hidden:  { y: 56, opacity: 0, filter: "blur(6px)", scale: 0.98 },
  visible: {
    y: 0, opacity: 1, filter: "blur(0px)", scale: 1,
    transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }
  },
  exit: {
    y: 56, opacity: 0, filter: "blur(6px)", scale: 0.98,
    transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }
  }
};

export const DeliveryCard = ({
  delivery,
  onClose,
  onAccept,
  onPickedUp,
  onDelivered,
  onNavigate,
  etaToBusiness,
  etaToDest,
}) => {
  useEffect(() => {
    if (delivery?.justAccepted) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [delivery?.justAccepted]);

  useEffect(() => {
    const onEsc = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const shortAddr = delivery?.BusinessAddress?.split(",")[0] || "";

  return (
    <motion.div
      key={delivery?.Id || delivery?.id || "delivery-card"}
      role="dialog"
      aria-modal="true"
      aria-label="Delivery details"
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className={[
        // position
        "fixed bottom-6 inset-x-0 mx-auto z-[999]",
        // sizing
        "w-[96%] md:w-[90%] max-w-3xl",
        // glass look to match search box
        "bg-white/20 backdrop-blur-xl",
        "ring-1 ring-white/30 border border-white/10",
        "shadow-[0_16px_40px_rgba(0,0,0,.18)]",
        "rounded-3xl",
        // spacing + typography
        "p-6 md:p-8 text-base md:text-lg text-gray-900"
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {delivery?.Item || "Delivery"}
          </h2>
          <p className="mt-1 text-sm md:text-base text-gray-700/90">
            <span className="font-medium">Pickup:</span> {shortAddr}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-2xl px-3 py-1.5 text-sm md:text-base text-gray-700 hover:bg-white/30 hover:ring-1 hover:ring-white/40 transition"
        >
          ✕
        </button>
      </div>

      {/* ETA + Payment */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {/* Left: To pickup / to destination (when posted) */}
        <div className="md:col-span-2 space-y-2">
          {delivery?.Status === "posted" && (
            <>
              <p className="flex items-center gap-2">
                <FaRoute className="text-indigo-600" />
                <span className="font-medium">To Pickup:</span>&nbsp;
                {etaToBusiness?.eta || "--"} | {etaToBusiness?.distance || "--"}
              </p>
              <p className="flex items-center gap-2">
                <FaRoute className="text-indigo-600" />
                <span className="font-medium">To Drop-off:</span>&nbsp;
                {etaToDest?.eta || "--"} | {etaToDest?.distance || "--"}
              </p>
            </>
          )}

          {delivery?.Status === "picked_up" && (
            <p className="flex items-center gap-2">
              <FaRoute className="text-indigo-600" />
              <span className="font-medium">To Destination:</span>&nbsp;
              {etaToDest?.eta || "--"} | {etaToDest?.distance || "--"}
            </p>
          )}
        </div>

        {/* Right: Payment */}
        <div className="md:justify-self-end">
          <p className="flex items-center gap-2">
            <FaMoneyBillAlt className="text-green-600" />
            <span className="font-medium">Payment:</span>
            <span className="text-xl md:text-2xl font-semibold">
              ₪ {Number(delivery?.Payment || 0).toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {delivery?.Status === "posted" && (
          <>
            <button
              onClick={() => onNavigate(delivery.BusinessLocation)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-medium
                         border border-indigo-600 text-indigo-700 hover:bg-indigo-50/70 transition"
            >
              <MdNavigation className="inline-block -mt-1 mr-1 text-xl" />
              Navigate
            </button>
            <button
              onClick={() => onAccept(delivery)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-semibold
                         bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Start
            </button>
          </>
        )}

        {delivery?.Status === "accepted" && (
          <>
            <button
              onClick={() => onNavigate(delivery.BusinessLocation)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-medium
                         border border-indigo-600 text-indigo-700 hover:bg-indigo-50/70 transition"
            >
              <MdNavigation className="inline-block -mt-1 mr-1 text-xl" />
              Navigate
            </button>
            <button
              onClick={() => onPickedUp(delivery)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-semibold
                         bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Pick Up
            </button>
          </>
        )}

        {delivery?.Status === "picked_up" && (
          <>
            <button
              onClick={() => onNavigate(delivery.DestinationLocation)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-medium
                         border border-indigo-600 text-indigo-700 hover:bg-indigo-50/70 transition"
            >
              <MdNavigation className="inline-block -mt-1 mr-1 text-xl" />
              Navigate
            </button>
            <button
              onClick={() => onDelivered(delivery)}
              className="w-full md:w-auto justify-center px-4 py-3 rounded-2xl text-base md:text-lg font-semibold
                         bg-green-600 text-white hover:bg-green-700 transition"
            >
              Delivered
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default DeliveryCard;
