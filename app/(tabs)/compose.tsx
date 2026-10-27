import { useAppearance } from "../../src/lib/appearance";
import { Redirect } from "expo-router";
export default function Compose() {
  useAppearance();

  return <Redirect href="/create" />;
}
