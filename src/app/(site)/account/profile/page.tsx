import { ProfilePageClient } from "@/components/account/ProfilePageClient";

export const metadata = {
  title: "Profile",
  description: "Manage your Magenta Crown account details and preferences.",
  robots: { index: false, follow: true }
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
