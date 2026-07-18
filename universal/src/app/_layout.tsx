import "../global.css";
import { Stack } from "expo-router";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavBar } from "soma-style";

export default function RootLayout() {
  return (
    <View className="flex-1 bg-base">
      <StatusBar style="light" />
      <NavBar
        brand="hevy2garmin"
        items={[{ key: "sync", label: "Sync" }, { key: "history", label: "History" }, { key: "settings", label: "Settings" }]}
        active="sync"
        onSelect={() => {}}
      />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a1720" } }} />
    </View>
  );
}
