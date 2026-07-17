import { ScrollView, View } from "react-native";
import { Text, Card, Badge, ProgressBar } from "soma-style";
import { useHevyStatus } from "../lib/api";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** hevy2garmin sync dashboard — live from the soma DB via /api/hevy/status. */
export default function SyncScreen() {
  const { data, error } = useHevyStatus();
  const recent = data?.recent ?? [];

  return (
    <ScrollView className="flex-1 bg-base" contentContainerClassName="items-center px-5 py-6">
      <View className="w-full max-w-2xl gap-4">
        <View className="flex-row items-center gap-2">
          <Text variant="title">Sync status</Text>
          <Badge
            label={data?.garminConnected ? "Garmin connected" : "Garmin offline"}
            tone={data?.garminConnected ? "success" : "danger"}
          />
        </View>

        {error ? (
          <Card><Text variant="body" className="text-danger">API: {error} — is soma running on :3456?</Text></Card>
        ) : null}

        {/* Connection cards */}
        <View className="flex-row gap-3">
          <Card className="flex-1 gap-1">
            <Text variant="eyebrow">Hevy</Text>
            <Text variant="title" className={data?.hevyConnected ? "text-teal" : "text-text-muted"}>
              {data?.hevyConnected ? "Connected" : "—"}
            </Text>
            <Text variant="micro">{recent.length} recent workouts</Text>
          </Card>
          <Card className="flex-1 gap-1">
            <Text variant="eyebrow">Garmin</Text>
            <Text variant="title" className={data?.garminConnected ? "text-teal" : "text-text-muted"}>
              {data?.garminConnected ? "Connected" : "—"}
            </Text>
            <Text variant="micro">FIT upload active</Text>
          </Card>
        </View>

        {/* Totals */}
        <Card className="gap-3">
          <Text variant="eyebrow">Synced to Garmin</Text>
          <View className="flex-row items-end gap-2">
            <Text variant="display">{data ? data.totalSynced : "…"}</Text>
            <Text variant="title" className="text-text-muted">workouts all-time</Text>
          </View>
          <ProgressBar pct={1} color="#6ad4a0" />
          <Text variant="caption" className="text-text-secondary">
            {data?.syncedThisWeek ?? 0} this week · every workout uploaded to Garmin
          </Text>
        </Card>

        {/* Recent workouts */}
        <View className="gap-2">
          <Text variant="eyebrow">Recent</Text>
          {recent.map((w, i) => (
            <Card key={`${w.title}-${w.date}-${i}`} className="gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text variant="body" className="text-text" numberOfLines={1}>{w.title}</Text>
                  <Text variant="micro">
                    {fmtDate(w.date)} · {w.kcal} kcal · {w.exercises} ex · {w.sets} sets
                  </Text>
                </View>
                <Badge
                  label={w.synced ? "Synced" : w.status}
                  tone={w.synced ? "success" : "warm"}
                />
              </View>
            </Card>
          ))}
          {data && recent.length === 0 ? (
            <Card><Text variant="body" className="text-text-secondary">No workouts synced yet.</Text></Card>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}
