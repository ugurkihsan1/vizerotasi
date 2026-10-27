import credits from "../content/photo-credits.json";
// Static requires keep every photograph available in the native app and web export.
export const photoAssets: Record<string, number> = {
  denmark: require("../../assets/destinations/denmark.jpg"),
  germany: require("../../assets/destinations/germany.jpg"),
  estonia: require("../../assets/destinations/estonia.jpg"),
  poland: require("../../assets/destinations/poland.jpg"),
  france: require("../../assets/destinations/france.jpg"),
  italy: require("../../assets/destinations/italy.jpg"),
  greece: require("../../assets/destinations/greece.jpg"),
  hungary: require("../../assets/destinations/hungary.jpg"),
  netherlands: require("../../assets/destinations/netherlands.jpg"),
  spain: require("../../assets/destinations/spain.jpg"),
  norway: require("../../assets/destinations/norway.jpg"),
};
export const photoCredits = credits;
