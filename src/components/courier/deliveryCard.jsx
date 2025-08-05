import { useEffect } from "react";
import { motion } from "framer-motion";
import { FaMoneyBillAlt, FaRoute } from "react-icons/fa";
import { MdNavigation } from "react-icons/md";
import confetti from "canvas-confetti";

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
    if (delivery.justAccepted) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [delivery.justAccepted]);

  const shortAddr = delivery?.BusinessAddress?.split(",")[0] || "";

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4 z-50"
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">
          {delivery.Item || "Delivery"}
        </h2>
        <button onClick={onClose} className="text-sm text-gray-500">
          ✕
        </button>
      </div>

      <div className="text-sm text-gray-700 mb-2">
        <p><strong>Pickup:</strong> {shortAddr}</p>
        {delivery.Status === "posted" && (
        <>
            <p className="flex items-center gap-2">
            <FaRoute className="text-indigo-500" />
            To Pickup: {etaToBusiness?.eta} | {etaToBusiness?.distance}
            </p>
            <p className="flex items-center gap-2 mt-1">
            <FaRoute className="text-indigo-500" />
            To Drop-off: {etaToDest?.eta} | {etaToDest?.distance}
            </p>
        </>
        )}

        {delivery.Status === "picked_up" && (
        <p className="flex items-center gap-2">
            <FaRoute className="text-indigo-500" />
            To Destination: {etaToDest?.eta} | {etaToDest?.distance}
        </p>
        )}
        <p className="flex items-center gap-2 mt-1">
          <FaMoneyBillAlt className="text-green-600" />
          Payment: ₪ {delivery.Payment?.toFixed(2)}
        </p>
      </div>

      <div className="flex justify-between items-center mt-4 gap-3">

        {delivery.Status === "posted" && (
        <>
        
        <button
          onClick={() => onNavigate(delivery.BusinessLocation)}
          className="flex-1 px-3 py-2 text-indigo-600 border border-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-50"
        >
          <MdNavigation className="inline-block mr-1 text-lg" /> Navigate
        </button>

        <button
            onClick={() => onAccept(delivery)}
            className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
          >
            Start
          </button>     
        </>

        )}

        {delivery.Status === "accepted" && (
        <>
            <button
            onClick={() => onNavigate(delivery.BusinessLocation)}
            className="flex-1 px-3 py-2 text-indigo-600 border border-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-50"
            >
            <MdNavigation className="inline-block mr-1 text-lg" /> Navigate
            </button>
            <button
                onClick={() => onPickedUp(delivery)}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700"
            >
            Pick Up
          </button>
        </>

        )}

        {delivery.Status === "picked_up" && (
        <>
            <button
                onClick={() => onNavigate(delivery.DestinationLocation)}
                className="flex-1 px-3 py-2 text-indigo-600 border border-indigo-600 rounded-full text-sm font-medium hover:bg-indigo-50"
                >
                <MdNavigation className="inline-block mr-1 text-lg" /> Navigate
            </button>
            <button
                onClick={() => onDelivered(delivery)}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700"
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
