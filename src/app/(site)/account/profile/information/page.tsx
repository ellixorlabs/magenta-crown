import { ProfileAuthGate } from "@/components/account/ProfileAuthGate";
import { ProfilePwaInformation } from "@/components/account/ProfilePwaInformation";

export const metadata = {
  title: "Information",
  robots: { index: false, follow: true }
};

export default function ProfileInformationPage() {
  return (
    <ProfileAuthGate callbackPath="/account/profile/information">
      <ProfilePwaInformation />
    </ProfileAuthGate>
  );
}
