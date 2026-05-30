import type { Metadata } from "next";
import GuestBookingClient from "./GuestBookingClient";
import { fetchPropertyBySlug } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await fetchPropertyBySlug(slug);

  if (!property) {
    return { title: "StayPick" };
  }

  const image = property.rooms?.[0]?.images?.[0]?.main_url
    ?? property.rooms?.[0]?.image_url
    ?? undefined;

  return {
    title: property.name,
    description: property.description ?? `${property.name} 예약 페이지`,
    openGraph: {
      title: property.name,
      description: property.description ?? `${property.name} 예약 페이지`,
      images: image ? [{ url: image }] : [],
      type: "website",
    },
  };
}

export default async function GuestBookingPage({ params }: Props) {
  const { slug } = await params;
  return <GuestBookingClient slug={slug} />;
}
