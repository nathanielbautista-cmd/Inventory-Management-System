function getOwnerAdminId(req) {
  return req.user?.ownerAdminId || req.user?.id;
}

function ownerQuery(req) {
  return { ownerAdminId: getOwnerAdminId(req) };
}

module.exports = { getOwnerAdminId, ownerQuery };
