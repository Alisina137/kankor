const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require("expo/fingerprint");

/** @type {import("expo/fingerprint").Config} */
module.exports = {
  sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.ExpoConfigExtraSection
};
