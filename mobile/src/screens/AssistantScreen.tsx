import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Speech from "expo-speech";
import { SafeAreaView } from "react-native-safe-area-context";

import fixture from "../../../fixtures/sprint-09.json";
import { colors, spacing, touchTarget } from "../theme";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  translation?: string;
};

export function AssistantScreen() {
  const navigation = useNavigation<any>();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Marhbe, stafedni. Nejmou nswerouk 3la el parcelle wel puits.",
      translation: "Bienvenue, posez-moi une question sur la parcelle ou le puits.",
    },
  ]);

  function findAnswer(input: string) {
    const normalized = input.toLowerCase();
    let match = fixture.questions.find((item) =>
      normalized === item.darija.toLowerCase()
      || normalized === item.fr.toLowerCase()
    );
    if (!match) {
      match = [...fixture.questions].sort((a, b) =>
        b.keywords.filter((word) => normalized.includes(word)).length
        - a.keywords.filter((word) => normalized.includes(word)).length
      )[0];
      const score = match?.keywords.filter((word) => normalized.includes(word)).length ?? 0;
      if (score === 0) {
        return {
          text: fixture.out_of_scope.answer,
          translation: fixture.out_of_scope.fr_answer,
          inScope: false,
        };
      }
    }
    return {
      text: match.answer,
      translation: match.fr_answer,
      inScope: true,
    };
  }

  function ask(input: string) {
    const value = input.trim();
    if (!value) return;
    const answer = findAnswer(value);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-q`, role: "user", text: value },
      {
        id: `${Date.now()}-a`,
        role: "assistant",
        text: answer.text,
        translation: answer.translation,
      },
    ]);
    setQuestion("");
  }

  function speak(text: string) {
    Speech.speak(text, { language: "ar-TN", pitch: 1.0, rate: 0.85 });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Assistant Ardi</Text>
        <ScrollView contentContainerStyle={styles.messages}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.bubble, message.role === "user" ? styles.userBubble : styles.assistantBubble]}
            >
              <Text style={[styles.bubbleText, message.role === "user" && styles.userText]}>
                {message.text}
              </Text>
              {message.role === "assistant" && message.translation && (
                <>
                  <Text style={styles.translation}>FR · {message.translation}</Text>
                  <Pressable accessibilityRole="button" style={styles.listen} onPress={() => speak(message.text)}>
                    <Text style={styles.listenText}>Lire à voix haute</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}

          {messages.length > 1 && (
            <View style={styles.actionRow}>
              {fixture.actions.map((action) => (
                <Pressable
                  key={action.id}
                  accessibilityRole="button"
                  style={styles.actionCard}
                  onPress={() => navigation.navigate(action.route)}
                >
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
          {fixture.questions.slice(0, 6).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              style={styles.suggestion}
              onPress={() => ask(item.darija)}
            >
              <Text style={styles.suggestionText}>{item.darija}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Pose une question en darija..."
            style={styles.input}
            onSubmitEditing={() => ask(question)}
          />
          <Pressable accessibilityRole="button" style={styles.send} onPress={() => ask(question)}>
            <Text style={styles.sendText}>Envoyer</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800", padding: spacing.lg, paddingBottom: spacing.sm },
  messages: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  bubble: { maxWidth: "88%", borderRadius: 16, padding: spacing.md, borderWidth: 1 },
  userBubble: { alignSelf: "flex-end", backgroundColor: colors.primary, borderColor: colors.primary },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border },
  bubbleText: { color: colors.text, lineHeight: 20 },
  userText: { color: "#fff", fontWeight: "700" },
  translation: { color: colors.muted, marginTop: 6, fontSize: 12 },
  listen: { minHeight: 44, marginTop: spacing.sm, borderRadius: 12, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  listenText: { color: colors.primary, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionCard: { flex: 1, minHeight: 88, borderRadius: 16, backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#86efac", padding: spacing.md, justifyContent: "center" },
  actionTitle: { color: colors.primary, fontWeight: "900" },
  actionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  suggestions: { maxHeight: 60, paddingHorizontal: spacing.lg },
  suggestion: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md, marginRight: spacing.sm },
  suggestionText: { color: colors.text, fontWeight: "700" },
  inputRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg, alignItems: "center" },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  send: { minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  sendText: { color: "#fff", fontWeight: "900" },
});
