import SportOddsPage from "@/components/sportsbook/SportOddsPage";

export default function Page({ params }: { params: { sportKey: string } }) {
  return <SportOddsPage sportKey={params.sportKey} />;
}
