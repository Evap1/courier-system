import { useState } from "react";
import { postWithAuth } from "../../api/api";
import { AddressInput } from "../address";
import { useAuth } from "../../context/AuthContext";
import { getWithAuth } from "../../api/api";


export const NewDeliveryTab = ({ businessData,  open, onClose }) => {
    const { user } = useAuth();
    const [item, setItem] = useState("");
    const [destination, setDestination] = useState("");
    const [payment, setPayment] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    if (!open) return null;

    // this functions posts a new delivery, using API req.
    const handleNewDelivery = async (e) => {
        e.preventDefault();
        if (!item || !destination) {
            setError("Item and Destination are required.");
            return;
        }
        const parsedPayment = parseFloat(payment);
    
        if (isNaN(parsedPayment)) {
            setError("Please enter only numbers for payment");
            return
        }
        // send api req to create new delivery
        try {
            const body = {
              BusinessName: businessData.BusinessName,
              BusinessAddress: businessData.BusinessAddress,
              BusinessLocation: businessData.BusinessLocation,
              DestinationAddress: destination.formatted,
              DestinationLocation: {
                Lat: destination.location.lat,
                Lng: destination.location.lng
              },
              Item: item,
              Payment: parsedPayment
            };
            await postWithAuth("http://localhost:8080/deliveries", body);
        
            // reset the fields
            setItem("");
            setDestination("");
            setError(null);
            setPayment(0);

            // ✅ Show success + auto-close modal after 1.5s
            setSuccess("Delivery created successfully!");
            setTimeout(() => {
                setSuccess(null);
                onClose();
            }, 1500);
            } catch (err) {
            console.error("Error creating delivery:", err);
            setError("Failed to create delivery");
            }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 relative">
                <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>

                <div className="max-w-screen-xl mx-auto px-4 md:px-8">
                    <div className="items-start justify-between md:flex">
                        <div className="max-w-lg">
                            <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                                Place a New Delivery
                            </h3>
                        </div>
                    </div>
                <form className="space-y-4 max-w-md">
                    <div>
                    <label className="block mb-1 font-medium">Item:</label>
                    <input
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                        required
                        className="w-full border px-3 py-2"
                    />
                    </div>
                    <div>
                    <label className="block mb-1 font-medium">Payment:</label>
                    <input
                        value={payment}
                        onChange={(e) => setPayment(e.target.value)}
                        required
                        className="w-full border px-3 py-2"
                    />
                    </div>
                    <div>
                    <label className="block mb-1 font-medium">Destination:</label>
                        <AddressInput onSelect={setDestination} />
                    </div>
                    <button
                        onClick={handleNewDelivery}
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                        Submit
                    </button>
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-lg">
                          {error}
                        </div>
                      )}

                    {success && (
                        <div className="text-sm text-green-600 bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
                          {success}
                        </div>
                      )}
                </form>
                </div>
            </div>
        </div>
        
      );
};

