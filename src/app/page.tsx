import AnnouncementPanel from "@/component/AnnouncementPanel";
import { BookSearchBar } from "@/component/BookSearchBar";
import { RentalRankingContainer } from "@/component/RentalRankingContainer";
import { Suspense } from "react";

export default function Home() {
  return (
    <main style={{flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
      <h1>Library Project</h1>
      <p style={{margin: "2%"}}>
        Welcome to the library management app.
      </p>
      <Suspense fallback={<div>Loading</div>}>
        <BookSearchBar/>
        <AnnouncementPanel rowCount={5} page={1} full={false}/>
        <RentalRankingContainer/>
      </Suspense>
    </main>
  );
}
