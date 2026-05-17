import { ProfileAuthGate } from "@/components/account/ProfileAuthGate";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";
import { ProfilePwaSubpage } from "@/components/account/ProfilePwaSubpage";

export const metadata = {
  title: "Addresses",
  robots: { index: false, follow: true }
};

export default function ProfileAddressesPage() {
  return (
    <ProfileAuthGate callbackPath="/account/profile/addresses">
      <ProfilePwaSubpage title="Address Management">
        <ProfileFormClient section="addresses" />
      </ProfilePwaSubpage>
    </ProfileAuthGate>
  );
}
