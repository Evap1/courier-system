/**
 * ProfileTab renders a simple unified profile card for any role (business/courier/admin).
 * It expects a `profile` object and derives display fields with sensible fallbacks:
 * For business users it also shows BusinessAddress when present. Intended for the account/profile view.
 */

export const ProfileTab = ({profile = {}}) => {

    if (!profile) {
      return (
        <div className="flex justify-center items-center h-64">
          <span className="text-red-500 text-lg">{"No profile found."}</span>
        </div>
      );
    }
  
    // Fallbacks for demo, update these according to your API shape!
    const name = profile.BusinessName || profile.CourierName || profile.AdminName || profile.name || "Your Name";
    const email = profile.Email;
    const role =  profile.Role;
    const avatarUrl = profile.profilePicture || "https://randomuser.me/api/portraits/women/79.jpg";
  
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-8 flex flex-col items-center mt-12">
        <img
          src={avatarUrl}
          alt="Profile"
          className="w-28 h-28 rounded-full border-4 border-blue-100 object-cover shadow"
        />
        <h2 className="mt-4 text-2xl font-bold text-gray-800">{name}</h2>
        <span className="mt-1 inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold capitalize">
          {role}
        </span>
        <p className="mt-2 text-gray-500">{email}</p>
        <hr className="my-6 w-3/4 border-gray-200" />
  
        {/* extra info for business user */}
        <div className="w-full flex flex-col items-center gap-2">
          {profile.BusinessAddress && (
            <div>
              <span className="font-medium text-gray-700">Business Address: </span>
              <span className="text-gray-600">{profile.BusinessAddress}</span>
            </div>
          )}
        </div>
      </div>
    );
}

export default ProfileTab;