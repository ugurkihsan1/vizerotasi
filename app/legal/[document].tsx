import { Stack, useLocalSearchParams, Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import {
  useAppearance,
  darkPalette,
  lightPalette,
  textSize,
} from "../../src/lib/appearance";
import { legalDocument, legalDocuments } from "../../src/content/legal";

function InlineText({ children }: { children: string }) {
  return children.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <Text key={index} style={{ fontWeight: "700" }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );
}

export default function LegalPage() {
  const appearance = useAppearance();
  const palette = appearance.dark ? darkPalette : lightPalette;
  const params = useLocalSearchParams<{ document?: string | string[] }>();
  const id = Array.isArray(params.document)
    ? params.document[0]
    : params.document;
  const document = legalDocument(id);
  const body = {
    color: palette.text,
    fontSize: textSize(15),
    lineHeight: textSize(24),
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 22 }}
    >
      <Stack.Screen
        options={{ title: document?.shortTitle ?? "Yasal bilgiler" }}
      />
      {!document ? (
        <Text style={body}>Metin bulunamadı.</Text>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            <Text
              selectable
              accessibilityRole="header"
              style={{
                color: palette.heading,
                fontSize: textSize(24),
                lineHeight: textSize(31),
                fontWeight: "700",
              }}
            >
              {document.title}
            </Text>
            <Text selectable style={{ ...body, color: palette.muted }}>
              Son güncelleme: {document.updatedAt}
            </Text>
          </View>
          {document.sections.map((section) => (
            <View key={section.heading} style={{ gap: 12 }}>
              <Text
                selectable
                accessibilityRole="header"
                style={{
                  color: palette.heading,
                  fontSize: textSize(18),
                  lineHeight: textSize(25),
                  fontWeight: "700",
                }}
              >
                {section.heading}
              </Text>
              {section.blocks.map((block, index) =>
                block.kind === "paragraph" ? (
                  <Text key={index} selectable style={body}>
                    <InlineText>{block.text}</InlineText>
                  </Text>
                ) : (
                  <View key={index} style={{ gap: 10 }}>
                    {block.items.map((item, itemIndex) => (
                      <Text key={itemIndex} selectable style={body}>
                        {"• "}
                        <InlineText>{item}</InlineText>
                      </Text>
                    ))}
                  </View>
                ),
              )}
            </View>
          ))}
        </>
      )}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: palette.border,
          paddingTop: 12,
        }}
      >
        {legalDocuments
          .filter((other) => other.id !== document?.id)
          .map((other) => (
            <Link
              key={other.id}
              href={{
                pathname: "/legal/[document]",
                params: { document: other.id },
              }}
              style={{
                ...body,
                paddingVertical: 12,
                textDecorationLine: "underline",
              }}
            >
              {other.shortTitle}
            </Link>
          ))}
      </View>
    </ScrollView>
  );
}
