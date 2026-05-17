import { ProfileAuthGate } from "@/components/account/ProfileAuthGate";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";
import { ProfilePwaSubpage } from "@/components/account/ProfilePwaSubpage";

export const metadata = {
  title: "Personal details",
  robots: { index: false, follow: true }
};

export default function ProfileDetailsPage() {
  return (
    <ProfileAuthGate callbackPath="/account/profile/details">
      <ProfilePwaSubpage title="Personal Details">
        <ProfileFormClient section="personal" />
      </ProfilePwaSubpage>
    </ProfileAuthGate>
  );
}
