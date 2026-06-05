const AUTH_STORAGE_KEYS = [
  "token",
  "userId",
  "role",
  "userName",
  "userEmail",
  "userPhoneNumber",
  "userAvatar",
];

export function normalizeRole(role) {
  const normalizedRole = (role || "").trim().toLowerCase();

  if (normalizedRole === "staff") return "inventory";
  if (normalizedRole === "pos") return "cashier";

  return normalizedRole;
}

export function saveCurrentUserSession(data) {
  const user = data?.user || {};
  const role = normalizeRole(user.role);

  localStorage.setItem("token", data?.token || "");
  localStorage.setItem("userId", user.id || user._id || "");
  localStorage.setItem("role", role);
  localStorage.setItem("userName", user.name || "");
  localStorage.setItem("userEmail", user.email || "");
  localStorage.setItem("userPhoneNumber", user.phoneNumber || "");
  localStorage.setItem("userAvatar", user.avatar || "");

  return role;
}

export function updateStoredUserProfile(user) {
  localStorage.setItem("userName", user?.name || "");
  localStorage.setItem("userEmail", user?.email || "");
  localStorage.setItem("userPhoneNumber", user?.phoneNumber || "");
  localStorage.setItem("userAvatar", user?.avatar || "");
}

export function clearCurrentUserSession() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}
