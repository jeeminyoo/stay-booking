import GuestBookingClient from "./GuestBookingClient";

export default async function GuestBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <GuestBookingClient slug={slug} />;
}
