import { View, Text } from "react-native";
import { useCountries } from "../lib/data";
import { Image } from "expo-image";
const palettes: Record<string, [string, string, string]> = {
  spain: ["#F5CEAB", "#D9805C", "#924F46"],
  france: ["#CFDFF7", "#779BCC", "#31517E"],
  italy: ["#EDD3B2", "#C5956B", "#7C5C48"],
  greece: ["#C6E4F1", "#5D9ECC", "#306486"],
  germany: ["#D1DDCF", "#9BAF97", "#576F61"],
  estonia: ["#D9D8F0", "#AAA1CF", "#69618F"],
  netherlands: ["#F4D6CD", "#CB9788", "#8B625D"],
  poland: ["#E4D3DE", "#B994AE", "#775A76"],
  hungary: ["#D9E5DE", "#92B1AC", "#4E7878"],
};
export function destinationSvg(id: string) {
  const [sky, building, ink] = palettes[id] ?? palettes.france;
  let landmark = "";
  if (id === "france")
    landmark = `<path d="M146 147 L177 38 L184 38 L215 147 M158 111 H202 M165 86 H195 M172 62 H189 M139 149 H221" fill="none" stroke="${ink}" stroke-width="5"/><path d="M165 147 Q180 117 197 147" fill="${sky}" stroke="${ink}" stroke-width="4"/>`;
  else if (id === "spain")
    landmark = `<path d="M112 155V82H242V155M123 82V55H143V82M212 82V55H233V82" fill="${building}" stroke="${ink}" stroke-width="3"/><path d="M130 155V115Q147 89 163 115V155 M188 155V115Q205 89 222 115V155" fill="${sky}" stroke="${ink}" stroke-width="3"/><path d="M173 155V101Q180 91 187 101V155" fill="${ink}"/><path d="M119 53H147M207 53H237" stroke="${ink}" stroke-width="5"/>`;
  else if (id === "germany")
    landmark = `<path d="M101 88H252V101H101Z M111 70H242V88H111Z" fill="${ink}"/>${[112, 137, 162, 187, 212, 237].map((x) => `<rect x="${x}" y="101" width="10" height="54" fill="${building}"/>`).join("")}<path d="M97 157H256M167 69V48H188V69M159 49H198" stroke="${ink}" stroke-width="6"/>`;
  else if (id === "italy")
    landmark = `<path d="M105 97Q180 55 253 97V158H105Z" fill="${building}"/>${[113, 140, 167, 194, 221].map((x) => `<path d="M${x} 144V125Q${x + 8} 111 ${x + 16} 125V144M${x} 110V98Q${x + 8} 85 ${x + 16} 98V110" fill="${sky}"/>`).join("")}<path d="M101 157H257M106 118H252" stroke="${ink}" stroke-width="4"/>`;
  else if (id === "greece")
    landmark = `<path d="M130 155V95Q152 70 174 95V155" fill="#FFFAF0"/><path d="M130 96A22 25 0 0 1 174 96Z" fill="${ink}"/><path d="M183 155V118Q203 92 225 118V155" fill="#FFFAF0"/><path d="M183 118A21 24 0 0 1 225 118Z" fill="${building}"/><rect x="145" y="127" width="14" height="28" rx="7" fill="${ink}"/>`;
  else
    landmark = [
      { x: 103, h: 64 },
      { x: 139, h: 83 },
      { x: 175, h: 57 },
      { x: 211, h: 75 },
    ]
      .map(
        ({ x, h }, i) =>
          `<path d="M${x} 157V${157 - h}L${x + 15} ${136 - h}L${x + 30} ${157 - h}V157Z" fill="${i % 2 ? ink : building}"/>${[0, 1, 2].map((n) => `<rect x="${x + 11}" y="${166 - h + n * 15}" width="7" height="9" rx="2" fill="${sky}"/>`).join("")}`,
      )
      .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="184" viewBox="0 0 360 184"><rect width="360" height="184" fill="${sky}"/><circle cx="281" cy="43" r="22" fill="#FFF8EA" opacity=".8"/><path d="M0 139Q65 97 126 139T256 133T380 136V184H0Z" fill="${building}" opacity=".22"/><path d="M18 51Q83 15 135 43" fill="none" stroke="${ink}" stroke-opacity=".25" stroke-dasharray="4 5" stroke-width="2"/>${landmark}<path d="M65 158H294" stroke="${ink}" opacity=".3" stroke-width="2"/></svg>`;
}
function flagSvg(code: string) {
  const rect = (x: number, y: number, w: number, h: number, color: string) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
  const horizontal = (colors: string[]) =>
    colors
      .map((c, i) =>
        rect(0, (i * 20) / colors.length, 30, 20 / colors.length, c),
      )
      .join("");
  const vertical = (colors: string[]) =>
    colors.map((c, i) => rect(i * 10, 0, 10, 20, c)).join("");
  let body = "";
  switch (code) {
    case "DE":
      body = horizontal(["#111111", "#DD2028", "#F4C844"]);
      break;
    case "EE":
      body = horizontal(["#4891D9", "#151515", "#FFFFFF"]);
      break;
    case "PL":
      body = horizontal(["#FFFFFF", "#DC143C"]);
      break;
    case "FR":
      body = vertical(["#173A8A", "#FFFFFF", "#ED2939"]);
      break;
    case "IT":
      body = vertical(["#169B62", "#FFFFFF", "#E53945"]);
      break;
    case "NL":
      body = horizontal(["#AE1C28", "#FFFFFF", "#21468B"]);
      break;
    case "HU":
      body = horizontal(["#CE2939", "#FFFFFF", "#477050"]);
      break;
    case "ES":
      body = rect(0, 0, 30, 20, "#AA151B") + rect(0, 5, 30, 10, "#F1BF00");
      break;
    case "GR":
      body =
        horizontal(
          Array.from({ length: 9 }, (_, i) => (i % 2 ? "#FFFFFF" : "#1767B0")),
        ) +
        rect(0, 0, 12, 11.12, "#1767B0") +
        rect(4.5, 0, 2.5, 11.12, "#FFFFFF") +
        rect(0, 4.4, 12, 2.3, "#FFFFFF");
      break;
    default:
      return null;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20">${body}</svg>`;
}
export function DestinationArt({
  id,
  height = 100,
}: {
  id: string;
  height?: number;
}) {
  const { data: countries } = useCountries();
  const country = countries?.find((c) => c.id === id);
  const flag = country ? flagSvg(country.code) : null;
  return (
    <View style={{ width: "100%", height, overflow: "hidden" }}>
      <Image
        source={{
          uri: `data:image/svg+xml;utf8,${encodeURIComponent(destinationSvg(id))}`,
        }}
        contentFit="cover"
        style={{ width: "100%", height }}
        accessible={false}
      />
      {country && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 9,
            top: 9,
            padding: 4,
            borderRadius: 8,
            backgroundColor: "#FFFFFFF0",
            borderWidth: 1,
            borderColor: "#FFFFFF",
            shadowColor: "#172F50",
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          {flag ? (
            <Image
              source={{
                uri: `data:image/svg+xml;utf8,${encodeURIComponent(flag)}`,
              }}
              style={{ width: 27, height: 18, borderRadius: 2 }}
              contentFit="contain"
              accessible={false}
            />
          ) : (
            <Text style={{ fontSize: 17 }}>{country.flag}</Text>
          )}
        </View>
      )}
    </View>
  );
}
