import { Ionicons } from "@expo/vector-icons";
import { useState, type PropsWithChildren } from "react";
import { View, Text, Pressable } from "react-native";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/dates";
import { textSize, useAppearance } from "../lib/appearance";
import type { Post } from "../lib/types";
import { EvidencePanel } from "./EvidencePanel";
import { styles, colors } from "./ui";

function Fold({ title, children }: PropsWithChildren<{ title: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: open ? 10 : 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={[styles.pillText, { fontSize: textSize(14) }]}>
          {title}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.muted}
        />
      </Pressable>
      {open && children}
    </View>
  );
}
export function PostExtraDetails({ post }: { post: Post }) {
  useAppearance();
  const { session, profile } = useAuth();
  const experience = post.kind === "experience";
  const dates = experience
    ? [
        ["Başvuru", post.application_date],
        ["Randevu", post.appointment_date],
        ["Sonuç", post.decision_date],
        ["Pasaport teslimi", post.passport_date],
      ].filter(([, date]) => !!date)
    : [];
  const privateDocuments =
    ["experience", "tip"].includes(post.kind) &&
    (session?.user.id === post.user_id ||
      (!!profile && profile.role !== "user"));
  const hasNotes =
    experience &&
    (post.advice ||
      post.invitation_notes ||
      post.previous_visas?.length ||
      dates.length);
  if (!hasNotes && !privateDocuments) return null;
  return (
    <View style={{ gap: 12 }}>
      {experience && !!post.advice && (
        <View style={{ gap: 5 }}>
          <Text style={styles.pillText}>Başvuru notu</Text>
          <Text style={styles.text}>{post.advice}</Text>
        </View>
      )}
      {experience && !!post.invitation_notes && (
        <View style={{ gap: 5 }}>
          <Text style={styles.pillText}>Davetiye</Text>
          <Text style={styles.text}>{post.invitation_notes}</Text>
        </View>
      )}
      {!!dates.length && (
        <Fold title="Başvuru tarihleri">
          {dates.map(([label, value]) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text style={styles.muted}>{label}</Text>
              <Text style={styles.text}>{formatDate(value)}</Text>
            </View>
          ))}
        </Fold>
      )}
      {experience && !!post.previous_visas?.length && (
        <Fold title={`Önceki vizeler · ${post.previous_visas.length}`}>
          {post.previous_visas.map((visa, index) => (
            <View key={index} style={{ gap: 4 }}>
              <Text style={styles.pillText}>
                {[visa.country, visa.duration].filter(Boolean).join(" · ")}
              </Text>
              {!!(visa.issue_date || visa.entries) && (
                <Text style={styles.muted}>
                  {[
                    visa.issue_date ? formatDate(visa.issue_date) : null,
                    visa.entries
                      ? {
                          single: "Tek giriş",
                          double: "Çift giriş",
                          multi: "Çok giriş",
                        }[visa.entries]
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
              {!!visa.notes && <Text style={styles.text}>{visa.notes}</Text>}
            </View>
          ))}
        </Fold>
      )}
      {privateDocuments && (
        <Fold title="Belgeler">
          <EvidencePanel post={post} />
        </Fold>
      )}
    </View>
  );
}
