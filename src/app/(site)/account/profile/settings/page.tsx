import { ProfileAuthGate } from "@/components/account/ProfileAuthGate";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";
import { ProfilePwaSubpage } from "@/components/account/ProfilePwaSubpage";

export const metadata = {
  title: "Settings",
  robots: { index: false, follow: true }
};

export default function ProfileSettingsPage() {
  return (
    <ProfileAuthGate callbackPath="/account/profile/settings">
      <ProfilePwaSubpage title="Settings">
        <ProfileFormClient section="settings" />
      </ProfilePwaSubpage>
    </ProfileAuthGate>
  );
}
